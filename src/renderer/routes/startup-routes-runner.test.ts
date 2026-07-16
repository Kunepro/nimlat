import type { AnimeDbStartupReadiness } from "@nimlat/types/ipc-payloads";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	AnimeDbStartupFacade,
	UserConfigFacade,
} from "../facades";
import {
	loadAnimeDbStartupReadiness,
	loadLastRoute,
} from "./startup-routes-runner";

describe(
	"startup-routes-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads startup readiness and last route through their facades",
			async () => {
				const readiness: AnimeDbStartupReadiness = {
					status:                 "ready",
					canUseLocalCatalog:     true,
					shouldDownloadBaseline: false,
					animeDbVersion:         "2026.07.02",
					message:                "Ready",
				};
				vi.spyOn(
					AnimeDbStartupFacade,
					"getReadiness",
				).mockResolvedValue(readiness);
				vi.spyOn(
					UserConfigFacade,
					"getLastRoute",
				).mockResolvedValue("/groups");

				await expect(loadAnimeDbStartupReadiness()).resolves.toBe(readiness);
				await expect(loadLastRoute()).resolves.toBe("/groups");

				expect(AnimeDbStartupFacade.getReadiness).toHaveBeenCalledTimes(1);
				expect(UserConfigFacade.getLastRoute).toHaveBeenCalledTimes(1);
			},
		);
	},
);
