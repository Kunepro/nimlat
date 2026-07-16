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
	getMediasFromStaffQueue:  vi.fn(),
	getMediaName:             vi.fn(),
	markStaffQueueProcessing: vi.fn(),
	processStaffBatch:        vi.fn(),
	deleteFromStaffQueue:     vi.fn(),
	updateFailedStaffQueue:   vi.fn(),
};

const aniListApi = {
	streamStaffForMedia: vi.fn(),
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
	"processMediaStaffQueue",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			facade.getMediaName.mockReturnValue("Smoke Media");
			facade.processStaffBatch.mockImplementation(() => undefined);
			aniListApi.streamStaffForMedia.mockReturnValue(of({
				kind:  "completed",
				items: [],
			}));
		});

		it(
			"marks the queue row failed when staff storage throws",
			async () => {
				facade.getMediasFromStaffQueue.mockReturnValue([ 456 ]);
				facade.processStaffBatch.mockImplementation(() => {
					throw new Error("DB write failed");
				});

				const { processMediaStaffQueue } = await import("./group-staff-daemon");

				processMediaStaffQueue();
				await vi.waitFor(() => {
					expect(facade.updateFailedStaffQueue).toHaveBeenCalledWith(
						456,
						"DB write failed",
					);
				});

				expect(facade.markStaffQueueProcessing).toHaveBeenCalledWith(456);
				expect(facade.processStaffBatch).toHaveBeenCalledWith(
					456,
					[],
				);
				expect(facade.deleteFromStaffQueue).not.toHaveBeenCalled();
				expect(progress.publishHydratorTaskFailed).toHaveBeenCalledWith({
					taskId:  "staff:456",
					queue:   "staff",
					message: "Failed to store staff for Smoke Media",
				});
				expect(logger.logHydrationQueueError).not.toHaveBeenCalled();
			},
		);

		it(
			"publishes page progress from the AniList staff event stream",
			async () => {
				facade.getMediasFromStaffQueue.mockReturnValue([ 456 ]);
				aniListApi.streamStaffForMedia.mockReturnValue(of(
					{
						kind:        "page-requested",
						page:        3,
						hasNextPage: true,
					},
					{
						kind:  "completed",
						items: [],
					},
				));

				const { processMediaStaffQueue } = await import("./group-staff-daemon");

				processMediaStaffQueue();
				await vi.waitFor(() => {
					expect(facade.deleteFromStaffQueue).toHaveBeenCalledWith(456);
				});

				expect(aniListApi.streamStaffForMedia).toHaveBeenCalledWith(
					456,
					"media-data",
					{
						queue:     "staff",
						mediaId:   456,
						idAniList: 456,
						source:    "hydrator.staff",
						recovery:  "queue failure is persisted and retried by the staff hydrator",
					},
				);
				expect(progress.publishHydratorTaskStarted).toHaveBeenCalledWith({
					taskId:  "staff:456",
					queue:   "staff",
					message: "Fetching staff for Smoke Media page 3/many",
				});
			},
		);
	},
);
