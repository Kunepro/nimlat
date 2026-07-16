import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { OpenExternalUrlResult } from "@nimlat/types/electron-api";
import { shell } from "electron";

const ALLOWED_EXTERNAL_PROTOCOLS = new Set([
	"http:",
	"https:",
]);

function parseExternalUrl(url: string): string | null {
	try {
		const parsedUrl = new URL(url);
		return ALLOWED_EXTERNAL_PROTOCOLS.has(parsedUrl.protocol)
			? parsedUrl.toString()
			: null;
	} catch {
		return null;
	}
}

export class ExternalNavigationService {
	// Main owns shell access so renderer links cannot bypass protocol allow-listing.
	public static async openExternalUrl(
		url: string,
		context = "external-navigation.open-url",
	): Promise<OpenExternalUrlResult> {
		const parsedUrl = parseExternalUrl(url);
		if (!parsedUrl) {
			const error = new Error("Unsupported external URL.");
			LoggerUtils.logMainServiceError(
				context,
				error,
				{ url },
			);
			return {
				success: false,
				error:   error.message,
			};
		}

		try {
			await shell.openExternal(parsedUrl);
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				context,
				tsError,
				{ url: parsedUrl },
			);
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}
}
