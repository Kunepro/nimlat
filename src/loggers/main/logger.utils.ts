import { GroupBlueprintDto } from "@nimlat/types/anime-db";
import {
	type AniListRateLimiterErrorContext,
	writeAniListRateLimiterErrorLog,
} from "./ani-list-rate-limiter-error-log";
import { formatCreateGroupErrorLog } from "./database/format-create-group-error-log";
import { formatHydrationQueueErrorLog } from "./database/format-hydration-queue-error-log";
import { formatMediaInsertErrorLog } from "./database/format-media-insert-error-log";
import { formatRemoveMediaFromGroupErrorLog } from "./database/format-remove-media-from-group-error-log";
import { writeMainOperationalLog } from "./main-operational-log";
import {
	writeMainInitializationErrorLog,
	writeMainServiceErrorLog,
} from "./main-service-error-log";
import { generateLogFileName } from "./utils/generate-log-file-name";
import { writeDbErrorLogFile } from "./utils/write-db-error-log-file";
import { writeErrorLogFile } from "./utils/write-error-log-file";

export class LoggerUtils {
	private static debugLoggingEnabledResolver: (() => boolean) | null = null;

	// Register a resolver used to decide whether debug-only console info/warning logs
	// should be emitted. This keeps DB-backed configuration lookup out of business logic.
	static setDebugLoggingEnabledResolver(resolver: () => boolean): void {
		LoggerUtils.debugLoggingEnabledResolver = resolver;
	}

	static logMainInfo(
		context: string,
		message: string,
		details?: Record<string, unknown>,
	): string {
		if (!LoggerUtils.isDebugLoggingEnabled()) {
			return "";
		}

		return writeMainOperationalLog({
			context,
			details,
			level: "info",
			message,
		});
	}

	static logMainWarning(
		context: string,
		message: string,
		details?: Record<string, unknown>,
	): string {
		if (!LoggerUtils.isDebugLoggingEnabled()) {
			return "";
		}

		return writeMainOperationalLog({
			context,
			details,
			level: "warning",
			message,
		});
	}

	static logErrorGroupCreate(
		group: Omit<GroupBlueprintDto, "id">,
		dbError: Error,
	): string {
		const timestamp = Date.now();
		const log       = formatCreateGroupErrorLog(
			group,
			timestamp,
			dbError,
		);

		const fileName = generateLogFileName(
			"create-group-error",
			timestamp,
		);
		writeDbErrorLogFile(
			log,
			fileName,
			dbError,
		);

		return log;
	}

	static logMainServiceError(
		context: string,
		error: Error,
		details?: Record<string, unknown>,
	): string {
		return writeMainServiceErrorLog(
			context,
			error,
			details,
		);
	}

	static logErrorMediaInsert(
		media: { id?: number | null; idMal?: number | null },
		dbError: Error,
		dbErrorLoggingError: Error,
	): string {
		const timestamp = Date.now();
		const log = formatMediaInsertErrorLog(
			media,
			timestamp,
			dbError,
			dbErrorLoggingError,
		);

		const fileName = generateLogFileName(
			"insert-media-error",
			timestamp,
		);
		writeDbErrorLogFile(
			log,
			fileName,
			dbError,
			dbErrorLoggingError,
		);

		return log;
	}

	static logErrorRemoveMediaFromGroup(
		groupId: number,
		mediaId: number,
		error: Error,
	): string {
		const timestamp = Date.now();
		const log = formatRemoveMediaFromGroupErrorLog(
			groupId,
			mediaId,
			timestamp,
			error,
		);

		const fileName = generateLogFileName(
			"remove-media-from-group-error",
			timestamp,
		);
		writeErrorLogFile(
			log,
			fileName,
			error,
		);

		return log;
	}

	static logHydrationQueueError(
		queueName: string,
		mediaId: number,
		error: Error,
	): string {
		const timestamp = Date.now();
		const log = formatHydrationQueueErrorLog(
			queueName,
			mediaId,
			timestamp,
			error,
		);

		const fileName = generateLogFileName(
			`hydration-${ queueName }-error`,
			timestamp,
		);
		writeErrorLogFile(
			log,
			fileName,
			error,
		);

		return log;
	}

	static logAniListRateLimiterError(
		error: Error,
		context: AniListRateLimiterErrorContext,
	): string {
		return writeAniListRateLimiterErrorLog(
			error,
			context,
		);
	}

	static logMainInitializationError(error: Error): string {
		return writeMainInitializationErrorLog(error);
	}

	// Info and warning logs are intended for active debugging sessions only.
	// Errors still log regardless of this flag.
	private static isDebugLoggingEnabled(): boolean {
		try {
			return LoggerUtils.debugLoggingEnabledResolver?.() ?? false;
		} catch {
			return false;
		}
	}
}
