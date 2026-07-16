// @vitest-environment node

import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildErroredContentRowViewModel,
	ERRORED_CONTENT_TABLE_HEADERS,
	getErroredContentRowKey,
} from "./errored-content-row-model";

const baseItem: ErroredContentItem = {
	queue:              "jikan-episode-thumbnails",
	mediaId:            57,
	name:               "Monster",
	queueStatus:        "failed",
	retryCount:         2,
	isHidden:           false,
	canOpenMedia:       true,
	canRetry:           true,
	isAutoRetryPlanned: false,
	isRetryExhausted:   false,
	recommendedAction:  "retry",
	fingerprint:        "jikan-episode-thumbnails:57",
};

describe(
	"errored-content-row-model",
	() => {
		it(
			"keeps table headers and row keys stable",
			() => {
				expect(ERRORED_CONTENT_TABLE_HEADERS).toEqual([
					"Content",
					"Queue",
					"Flags",
					"Retry / ID",
					"Error",
					"Last tried",
					"Actions",
				]);
				expect(getErroredContentRowKey(baseItem)).toBe("jikan-episode-thumbnails:57");
			},
		);

		it(
			"builds row copy with optional metadata and message fallbacks",
			() => {
				expect(buildErroredContentRowViewModel(baseItem)).toMatchObject({
					errorMessage:  "No error message was recorded.",
					errorReason:   "Retryable failure",
					lastTriedText: "Not tried yet",
					mediaMeta:     "Media 57",
					queueLabel:    "Episode thumbnails",
				});
			},
		);

		it(
			"includes format, status, retry state, and provider error text",
			() => {
				expect(buildErroredContentRowViewModel({
					...baseItem,
					format:         "TV",
					status:         "RELEASING",
					errorMessage:   "Timeout",
					resumeFromPage: 4,
				})).toMatchObject({
					errorMessage: "Timeout",
					mediaMeta:    "Media 57 - TV - RELEASING",
					retryMeta:    "Retry count 2 of 3 - resumes from page 4",
				});
			},
		);
	},
);
