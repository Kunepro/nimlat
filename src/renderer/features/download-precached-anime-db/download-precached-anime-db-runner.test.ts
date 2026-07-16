// @vitest-environment jsdom

import type {
	AnimeDbDownloadProgressData,
	AnimeDbStartupReadiness,
} from "@nimlat/types/ipc-payloads";
import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	AnimeDbDownloadFacade,
	AnimeDbStartupFacade,
	UserConfigFacade,
} from "../../facades";
import {
	cancelAnimeDbDownload,
	loadAnimeDbDownloadDevModeStatus,
	loadAnimeDbDownloadStatus,
	loadAnimeDbStartupReadiness,
	startAnimeDbDownload,
	subscribeToAnimeDbDownloadProgressChanges,
} from "./download-precached-anime-db-runner";

const progress: AnimeDbDownloadProgressData = {
	status:              "downloading",
	receivedBytes:       128,
	totalBytes:          256,
	percent:             0.5,
	speedBytesPerSecond: 64,
	etaSeconds:          2,
};

const readiness: AnimeDbStartupReadiness = {
	status:                 "empty",
	canUseLocalCatalog:     false,
	shouldDownloadBaseline: true,
	animeDbVersion:         null,
	message:                "Catalogue is empty.",
};

describe(
	"download-precached-anime-db-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads setup flags and download status through facade commands",
			async () => {
				vi.spyOn(
					UserConfigFacade,
					"getDevModeStatus",
				).mockResolvedValue(true);
				vi.spyOn(
					AnimeDbStartupFacade,
					"getReadiness",
				).mockResolvedValue(readiness);
				vi.spyOn(
					AnimeDbDownloadFacade,
					"getStatus",
				).mockResolvedValue(progress);

				await expect(loadAnimeDbDownloadDevModeStatus()).resolves.toBe(true);
				await expect(loadAnimeDbStartupReadiness()).resolves.toBe(readiness);
				await expect(loadAnimeDbDownloadStatus()).resolves.toBe(progress);

				expect(UserConfigFacade.getDevModeStatus).toHaveBeenCalledTimes(1);
				expect(AnimeDbStartupFacade.getReadiness).toHaveBeenCalledTimes(1);
				expect(AnimeDbDownloadFacade.getStatus).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"subscribes to download progress through the shared progress facade",
			() => {
				const progress$ = new Subject<AnimeDbDownloadProgressData>();
				const listener  = vi.fn();
				vi.spyOn(
					AnimeDbDownloadFacade,
					"progressChanges",
				).mockReturnValue(progress$);

				const subscription = subscribeToAnimeDbDownloadProgressChanges(listener);

				progress$.next(progress);
				expect(listener).toHaveBeenCalledWith(progress);
				expect(AnimeDbDownloadFacade.progressChanges).toHaveBeenCalledTimes(1);

				subscription.unsubscribe();
			},
		);

		it(
			"runs download actions through facade commands",
			async () => {
				vi.spyOn(
					AnimeDbDownloadFacade,
					"start",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					AnimeDbDownloadFacade,
					"cancel",
				).mockResolvedValue({
					success: false,
					error:   "cancel failed",
				});

				await expect(startAnimeDbDownload()).resolves.toEqual({ success: true });
				await expect(cancelAnimeDbDownload()).resolves.toEqual({
					success: false,
					error:   "cancel failed",
				});

				expect(AnimeDbDownloadFacade.start).toHaveBeenCalledTimes(1);
				expect(AnimeDbDownloadFacade.cancel).toHaveBeenCalledTimes(1);
			},
		);
	},
);
