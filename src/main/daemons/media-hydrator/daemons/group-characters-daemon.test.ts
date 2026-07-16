// @vitest-environment node
import { of } from "rxjs";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const facade = {
	getMediasFromGroupCharactersQueue:  vi.fn(),
	getMediaName:                       vi.fn(),
	markGroupCharactersQueueProcessing: vi.fn(),
	processCharactersBatch:             vi.fn(),
	deleteFromGroupCharactersQueue:     vi.fn(),
	updateFailedGroupCharactersQueue:   vi.fn(),
};

const aniListApi = {
	streamCharactersForMedia: vi.fn(),
};

const progress = {
	publishHydratorTaskStarted:   vi.fn(),
	publishHydratorTaskCompleted: vi.fn(),
	publishHydratorTaskFailed:    vi.fn(),
};

const logger = {
	logMainInfo:            vi.fn(),
	logHydrationQueueError: vi.fn(),
};

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: facade,
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: logger,
	}),
);

vi.mock(
	"../../../api/ani-list-api",
	() => ({
		AniListAPI: aniListApi,
	}),
);

vi.mock(
	"../../../services/hydrator/hydrator-progress-store",
	() => progress,
);

describe(
	"processMediaCharactersQueue",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			facade.getMediaName.mockReturnValue("Smoke Media");
			facade.processCharactersBatch.mockImplementation(() => undefined);
			aniListApi.streamCharactersForMedia.mockReturnValue(of({
				kind:  "completed",
				items: [],
			}));
		});

		it(
			"marks the queue row failed when character storage throws",
			async () => {
				facade.getMediasFromGroupCharactersQueue.mockReturnValue([ 123 ]);
				facade.processCharactersBatch.mockImplementation(() => {
					throw new Error("DB write failed");
				});

				const { processMediaCharactersQueue } = await import("./group-characters-daemon");

				processMediaCharactersQueue();
				await vi.waitFor(() => {
					expect(facade.updateFailedGroupCharactersQueue).toHaveBeenCalledWith(
						123,
						"DB write failed",
					);
				});

				expect(facade.markGroupCharactersQueueProcessing).toHaveBeenCalledWith(123);
				expect(facade.processCharactersBatch).toHaveBeenCalledWith(
					123,
					[],
				);
				expect(facade.deleteFromGroupCharactersQueue).not.toHaveBeenCalled();
				expect(progress.publishHydratorTaskFailed).toHaveBeenCalledWith({
					taskId:  "characters:123",
					queue:   "characters",
					message: "Failed to store characters for Smoke Media",
				});
				expect(logger.logHydrationQueueError).not.toHaveBeenCalled();
			},
		);

		it(
			"publishes page progress from the AniList character event stream",
			async () => {
				facade.getMediasFromGroupCharactersQueue.mockReturnValue([ 123 ]);
				aniListApi.streamCharactersForMedia.mockReturnValue(of(
					{
						kind:        "page-requested",
						page:        2,
						hasNextPage: true,
					},
					{
						kind:  "completed",
						items: [],
					},
				));

				const { processMediaCharactersQueue } = await import("./group-characters-daemon");

				processMediaCharactersQueue();
				await vi.waitFor(() => {
					expect(facade.deleteFromGroupCharactersQueue).toHaveBeenCalledWith(123);
				});

				expect(aniListApi.streamCharactersForMedia).toHaveBeenCalledWith(
					123,
					"media-data",
					{
						queue:     "characters",
						mediaId:   123,
						idAniList: 123,
						source:    "hydrator.characters",
						recovery:  "queue failure is persisted and retried by the characters hydrator",
					},
				);
				expect(progress.publishHydratorTaskStarted).toHaveBeenCalledWith({
					taskId:  "characters:123",
					queue:   "characters",
					message: "Fetching characters for Smoke Media page 2/many",
				});
			},
		);
	},
);
