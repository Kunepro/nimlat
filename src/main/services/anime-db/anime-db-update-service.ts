import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	AnimeDbUpdateActionResult,
	AnimeDbUpdateProgressData,
} from "@nimlat/types/ipc-payloads";
import { AnimeDbUpdater } from "./anime-db-updater";

export class AnimeDbUpdateService {
	public static async start(): Promise<AnimeDbUpdateActionResult> {
		try {
			await AnimeDbUpdateService.getUpdater().start();
			return { success: true };
		} catch (error) {
			const safeError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"anime-db.update.start-api",
				safeError,
			);
			return {
				success: false,
				error: safeError.message,
			};
		}
	}

	public static getStatus(): AnimeDbUpdateProgressData {
		return AnimeDbUpdateService.getUpdater().getProgress();
	}

	public static async stop(): Promise<AnimeDbUpdateActionResult> {
		try {
			await AnimeDbUpdateService.getUpdater().stop();
			return { success: true };
		} catch (error) {
			const safeError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"anime-db.update.stop-api",
				safeError,
			);
			return {
				success: false,
				error: safeError.message,
			};
		}
	}

	private static getUpdater(): AnimeDbUpdater {
		return AnimeDbUpdater.getInstance();
	}
}
