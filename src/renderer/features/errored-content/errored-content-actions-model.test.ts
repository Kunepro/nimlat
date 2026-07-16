// @vitest-environment node

import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildErroredContentActionState,
	isErroredContentActionPending,
} from "./errored-content-actions-model";
import { getRowActionKey } from "./errored-content-formatters";

const baseItem: ErroredContentItem = {
	queue:              "characters",
	mediaId:            86,
	name:               "Texhnolyze",
	queueStatus:        "failed",
	retryCount:         1,
	isHidden:           false,
	canOpenMedia:       true,
	canRetry:           true,
	isAutoRetryPlanned: false,
	isRetryExhausted:   false,
	recommendedAction:  "retry",
	fingerprint:        "characters:86",
};

describe(
	"errored-content-actions-model",
	() => {
		it(
			"detects pending row actions with queue-scoped keys",
			() => {
				expect(isErroredContentActionPending(
					baseItem,
					"retry",
					[
						getRowActionKey(
							baseItem,
							"retry",
						),
					],
				)).toBe(true);
			},
		);

		it(
			"builds button state from item capabilities and pending actions",
			() => {
				expect(buildErroredContentActionState(
					baseItem,
					[],
				)).toMatchObject({
					isRetryRecommended: true,
					retryDisabled:      false,
					reportDisabled:     false,
					hideDisabled:       false,
					retryTooltip:       "Retry",
				});
				expect(buildErroredContentActionState(
					{
						...baseItem,
						canRetry: false,
					},
					[
						getRowActionKey(
							baseItem,
							"hide",
						),
					],
				)).toMatchObject({
					isHiding:       true,
					retryDisabled:  true,
					reportDisabled: true,
					hideDisabled:   false,
					retryTooltip:   "Non-retryable",
				});
			},
		);
	},
);
