import { UserDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import {
	AnimeDbPopulationActionResult,
	PopulateAnimeDbProgressData,
} from "@nimlat/types/ipc-payloads";
import { AnimeDbPopulator } from "./populate-anime-db";

export class AnimeDbPopulationService {
	public static async start(startPage?: number): Promise<AnimeDbPopulationActionResult> {
		try {
			await AnimeDbPopulationService.getPopulator().start(startPage);
			return { success: true };
		} catch (error) {
			const safeError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"anime-db.populate.start-api",
				safeError,
			);
			return {
				success: false,
				error: safeError.message,
			};
		}
	}

	public static getStatus(): PopulateAnimeDbProgressData {
		return AnimeDbPopulationService.getPopulator().getProgress();
	}

	public static async stop(): Promise<AnimeDbPopulationActionResult> {
		try {
			await AnimeDbPopulationService.getPopulator().stop();
			return { success: true };
		} catch (error) {
			const safeError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"anime-db.populate.stop-api",
				safeError,
			);
			return {
				success: false,
				error: safeError.message,
			};
		}
	}

	public static async restart(): Promise<AnimeDbPopulationActionResult> {
		try {
			// Restart is a destructive full-rescan control. Normal users can start/continue
			// the scan from the current checkpoint, but clean rebuild remains dev/admin-only.
			if (!UserDbFacade.config.isDevModeEnabled()) {
				throw new Error("Only super-users can restart AnimeDB population from scratch.");
			}

			await AnimeDbPopulationService.getPopulator().restart();
			return { success: true };
		} catch (error) {
			const safeError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"anime-db.populate.restart-api",
				safeError,
			);
			return {
				success: false,
				error: safeError.message,
			};
		}
	}

	private static getPopulator(): AnimeDbPopulator {
		return AnimeDbPopulator.getInstance();
	}
}
