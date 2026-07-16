import { ERRORED_CONTENT_REPORT_SOURCE } from "@nimlat/constants/main/errored-content-report-source";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	ErroredContentItem,
	ErroredContentQueue,
} from "@nimlat/types/ipc-payloads";
import {
	readFetchErrorDetails,
	UpstreamHttpError,
} from "../../api/http/upstream-http-error";

const GITHUB_ISSUE_SEARCH_TIMEOUT_MS = 5_000;
const SOURCE_URL_PATTERN             = /https?:\/\/(?:graphql\.anilist\.co|api\.jikan\.moe|api\.myanimelist\.net|myanimelist\.net)[^\s"')]*/giu;

const QUEUE_LABELS: Record<ErroredContentQueue, string> = {
	characters:                 "Characters",
	staff:                      "Staff",
	"jikan-episodes":           "Episode updates",
	"jikan-episode-thumbnails": "Episode thumbnails",
};

interface GitHubIssueSearchResponse {
	items?: unknown;
}

// Reporting stays browser-mediated: the service only resolves the best GitHub URL,
// then the user reviews and submits the issue/comment with their own credentials.
export async function resolveErroredContentReportUrl(item: ErroredContentItem): Promise<string> {
	return await findExistingGitHubIssueUrl(item) ?? buildErroredContentNewIssueUrl(item);
}

function buildErroredContentNewIssueUrl(item: ErroredContentItem): string {
	const title  = truncateReportText(
		`[${ item.fingerprint }] ${ QUEUE_LABELS[ item.queue ] } failed for ${ item.name }`,
		120,
	);
	const params = new URLSearchParams({
		title,
		body: buildReportBody(item),
	});

	return `https://github.com/${ ERRORED_CONTENT_REPORT_SOURCE.owner }/${ ERRORED_CONTENT_REPORT_SOURCE.repo }/issues/new?${ params.toString() }`;
}

function buildGitHubSearchApiUrl(item: ErroredContentItem): string {
	const query  = `repo:${ ERRORED_CONTENT_REPORT_SOURCE.owner }/${ ERRORED_CONTENT_REPORT_SOURCE.repo } is:issue ${ item.fingerprint } in:title,body`;
	const params = new URLSearchParams({
		q:        query,
		per_page: "1",
	});

	return `https://api.github.com/search/issues?${ params.toString() }`;
}

function buildReportBody(item: ErroredContentItem): string {
	return [
		"This issue was opened from Nimlat so similar failures can be grouped by fingerprint.",
		"",
		`Fingerprint: ${ item.fingerprint }`,
		`Media: ${ item.name }`,
		`Media ID: ${ item.mediaId }`,
		`Catalog ID: ${ formatNullableReportValue(item.idAniList) }`,
		`Episode mapping ID: ${ formatNullableReportValue(item.idMal) }`,
		`Queue: ${ QUEUE_LABELS[ item.queue ] }`,
		`Failure reason: ${ sanitizeProviderCopy(formatNullableReportValue(item.failureReason)) }`,
		`Retry count: ${ item.retryCount }`,
		`Retry exhausted: ${ item.isRetryExhausted ? "yes" : "no" }`,
		`Last tried at: ${ formatNullableReportValue(item.lastTriedAt) }`,
		"",
		"Error message:",
		"```",
		sanitizeProviderCopy(item.errorMessage || "No error message was recorded."),
		"```",
		"",
		"Extra details:",
		"",
	].join("\n");
}

async function findExistingGitHubIssueUrl(item: ErroredContentItem): Promise<string | null> {
	const controller = new AbortController();
	const timeoutId  = setTimeout(
		() => controller.abort(),
		GITHUB_ISSUE_SEARCH_TIMEOUT_MS,
	);

	try {
		const searchUrl = buildGitHubSearchApiUrl(item);
		const response  = await fetch(
			searchUrl,
			{
				headers: {
					Accept: "application/vnd.github+json",
				},
				signal:  controller.signal,
			},
		);
		if (!response.ok) {
			LoggerUtils.logMainServiceError(
				"errored-content.github-issue-search",
				new UpstreamHttpError(
					`GitHub issue search failed with HTTP ${ response.status }`,
					response.status,
					await readFetchErrorDetails(
						response,
						searchUrl,
					),
				),
				{
					fingerprint: item.fingerprint,
					note:        "Non-fatal: report flow will open a new issue URL.",
				},
			);
			return null;
		}

		const payload = await response.json() as GitHubIssueSearchResponse;
		if (!Array.isArray(payload.items)) {
			return null;
		}

		return payload.items
			.map(getIssueHtmlUrl)
			.find((issueUrl): issueUrl is string => issueUrl != null) ?? null;
	} catch (error) {
		LoggerUtils.logMainWarning(
			"errored-content.github-issue-search",
			"GitHub issue search could not be completed.",
			{
				fingerprint: item.fingerprint,
				error:       typeSafeError(error).message,
			},
		);
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value != null;
}

function getIssueHtmlUrl(item: unknown): string | null {
	if (!isRecord(item) || typeof item.html_url !== "string") {
		return null;
	}

	return item.html_url;
}

function truncateReportText(value: string, maxLength: number): string {
	if (value.length <= maxLength) {
		return value;
	}

	return `${ value.slice(
		0,
		maxLength - 1,
	) }...`;
}

function formatNullableReportValue(value: number | string | boolean | null | undefined): string {
	if (value == null || value === "") {
		return "not recorded";
	}

	return String(value);
}

function sanitizeProviderCopy(value: string): string {
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
