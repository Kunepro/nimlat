import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import type { RowAction } from "../../types/errored-content";
import { HYDRATION_RETRY_LIMIT } from "./errored-content.constants";

const SOURCE_URL_PATTERN = /https?:\/\/(?:graphql\.anilist\.co|api\.jikan\.moe|api\.myanimelist\.net|myanimelist\.net)[^\s"')]+/giu;

export function formatDate(timestamp?: number | null): string {
	if (timestamp == null) {
		return "Not tried yet";
	}

	const date = new Date(timestamp);
	return Number.isNaN(date.getTime())
		? "Unknown time"
		: date.toLocaleString();
}

export function formatReason(item: ErroredContentItem): string {
	if (item.failureReason) {
		return sanitizeProviderCopy(item.failureReason
			.split("_")
			.map(part => part.charAt(0).toUpperCase() + part.slice(1))
			.join(" "));
	}

	return "Retryable failure";
}

export function sanitizeProviderCopy(value?: string | null): string {
	if (!value) {
		return "";
	}

	return value
		.replace(
			SOURCE_URL_PATTERN,
			"[source URL hidden]",
		)
		.replace(
			/\bAniList\b/gu,
			"catalog data",
		)
		.replace(
			/\bJikan\b/gu,
			"episode metadata",
		)
		.replace(
			/\bMyAnimeList\b/gu,
			"episode mapping",
		)
		.replace(
			/\bMAL\b/gu,
			"episode ID",
		);
}

export function formatRetryMeta(item: ErroredContentItem): string {
	const retryProgress = `Retry count ${ item.retryCount } of ${ HYDRATION_RETRY_LIMIT }`;
	const resumeText    = item.resumeFromPage ? ` - resumes from page ${ item.resumeFromPage }` : "";
	if (!item.canRetry) {
		return `${ retryProgress } - non-retryable${ resumeText }`;
	}

	if (item.isAutoRetryPlanned) {
		return item.nextAutoRetryAt
			? `${ retryProgress } - automatic retry planned for ${ formatDate(item.nextAutoRetryAt) }${ resumeText }`
			: `${ retryProgress } - automatic retry planned${ resumeText }`;
	}

	if (item.isRetryExhausted) {
		return `${ retryProgress } - automatic retries exhausted${ resumeText }`;
	}

	return `${ retryProgress }${ resumeText }`;
}

export function getRowActionKey(item: ErroredContentItem, action: RowAction): string {
	return `${ item.queue }:${ item.mediaId }:${ action }`;
}

export function extractLinks(value?: string | null): string[] {
	if (!value) {
		return [];
	}

	const matches = value.match(/https?:\/\/[^\s"')]+/g) ?? [];
	return Array.from(new Set(matches));
}
