// @vitest-environment node
import type {
	AnimeDbDownloadProgressData,
	AnimeDbUpdateProgressData,
	PopulateAnimeDbProgressData,
} from "@nimlat/types/ipc-payloads";
import { Subject } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const broadcastToRendererWindows = vi.fn();
const logMainServiceError        = vi.fn();

let animeDbDownloadProgressBus: Subject<AnimeDbDownloadProgressData>;
let animeDbUpdateProgressBus: Subject<AnimeDbUpdateProgressData>;
let populateAnimeDbProgressBus: Subject<PopulateAnimeDbProgressData>;

describe(
	"initAnimeDbEventsBridge",
	() => {
		beforeEach(async () => {
			vi.resetModules();
			vi.clearAllMocks();

			animeDbDownloadProgressBus = new Subject<AnimeDbDownloadProgressData>();
			animeDbUpdateProgressBus   = new Subject<AnimeDbUpdateProgressData>();
			populateAnimeDbProgressBus = new Subject<PopulateAnimeDbProgressData>();

			vi.doMock(
				"@nimlat/busses/main",
				() => ({
					BUS_AnimeDbDownloadProgress: animeDbDownloadProgressBus,
					BUS_AnimeDbUpdateProgress:   animeDbUpdateProgressBus,
					BUS_PopulateAnimeDbProgress: populateAnimeDbProgressBus,
				}),
			);
			vi.doMock(
				"@nimlat/constants/ipc-channels",
				() => ({
					IpcChannels: {
						AnimeDbDownloadProgress: "anime-db:download-progress",
						AnimeDbUpdateProgress:   "anime-db:update-progress",
						PopulateAnimeDbProgress: "anime-db:populate-progress",
					},
				}),
			);
			vi.doMock(
				"@nimlat/loggers/main",
				() => ({
					LoggerUtils: {
						logMainServiceError,
					},
				}),
			);
			vi.doMock(
				"../utils/ipc-broadcast",
				() => ({
					broadcastToRendererWindows,
				}),
			);

			const { initAnimeDbEventsBridge } = await import("./anime-db-events-bridge");
			initAnimeDbEventsBridge();
		});

		afterEach(async () => {
			const { disposeAnimeDbEventsBridge } = await import("./anime-db-events-bridge");
			disposeAnimeDbEventsBridge();
			animeDbDownloadProgressBus.complete();
			animeDbUpdateProgressBus.complete();
			populateAnimeDbProgressBus.complete();
			vi.doUnmock("@nimlat/busses/main");
			vi.doUnmock("@nimlat/constants/ipc-channels");
			vi.doUnmock("@nimlat/loggers/main");
			vi.doUnmock("../utils/ipc-broadcast");
		});

		it(
			"forwards AnimeDB workflow progress events to renderer IPC channels",
			() => {
				const downloadEvent = {
					status:              "downloading",
					receivedBytes:       1,
					totalBytes:          2,
					percent:             0.5,
					speedBytesPerSecond: null,
					etaSeconds:          null,
				} satisfies AnimeDbDownloadProgressData;
				const updateEvent   = {
					status:                          "running",
					phase:                           "updated-at-sweep",
					currentPage:                     1,
					processedMedias:                 5,
					totalMedias:                     10,
					totalMediasIsLowerBound:         false,
					cutoffProviderUpdatedAt:         null,
					lastSuccessfulProviderUpdatedAt: null,
				} satisfies AnimeDbUpdateProgressData;
				const populateEvent = {
					currentPage:             1,
					requestBatch:            1,
					totalPages:              null,
					processedMedias:         5,
					totalMedias:             10,
					totalMediasIsLowerBound: true,
					currentStatus:           "running",
				} satisfies PopulateAnimeDbProgressData;

				animeDbDownloadProgressBus.next(downloadEvent);
				animeDbUpdateProgressBus.next(updateEvent);
				populateAnimeDbProgressBus.next(populateEvent);

				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"anime-db:download-progress",
					downloadEvent,
				);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"anime-db:update-progress",
					updateEvent,
				);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"anime-db:populate-progress",
					populateEvent,
				);
			},
		);

		it(
			"does not attach duplicate AnimeDB subscriptions",
			async () => {
				const { initAnimeDbEventsBridge } = await import("./anime-db-events-bridge");
				initAnimeDbEventsBridge();
				initAnimeDbEventsBridge();

				animeDbDownloadProgressBus.next({
					status:              "idle",
					receivedBytes:       0,
					totalBytes:          null,
					percent:             null,
					speedBytesPerSecond: null,
					etaSeconds:          null,
				});

				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(1);
			},
		);
	},
);
