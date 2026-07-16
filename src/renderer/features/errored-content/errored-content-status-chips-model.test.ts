// @vitest-environment node

import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import { buildErroredContentStatusChipsViewModel } from "./errored-content-status-chips-model";

const baseItem: ErroredContentItem = {
	queue:              "staff",
	mediaId:            23,
	name:               "Ergo Proxy",
	queueStatus:        "failed",
	retryCount:         1,
	isHidden:           false,
	canOpenMedia:       true,
	canRetry:           true,
	isAutoRetryPlanned: false,
	isRetryExhausted:   false,
	recommendedAction:  "retry",
	fingerprint:        "staff:23",
};

describe(
	"errored-content-status-chips-model",
	() => {
		it(
			"builds needs-review retry chips",
			() => {
				expect(buildErroredContentStatusChipsViewModel(baseItem)).toEqual({
					actionHintColor:      "blue",
					actionHintLabel:      "Retry recommended",
					shouldShowHiddenChip: false,
					statusColor:          "red",
					statusLabel:          "Needs review",
				});
			},
		);

		it(
			"prioritizes hidden and planned/exhausted status labels",
			() => {
				expect(buildErroredContentStatusChipsViewModel({
					...baseItem,
					isHidden: true,
				})).toMatchObject({
					shouldShowHiddenChip: true,
					statusColor:          "default",
					statusLabel:          "Hidden",
				});
				expect(buildErroredContentStatusChipsViewModel({
					...baseItem,
					isAutoRetryPlanned: true,
					recommendedAction:  "report",
				})).toMatchObject({
					actionHintColor: "orange",
					actionHintLabel: "Report recommended",
					statusColor:     "green",
					statusLabel:     "Auto retry planned",
				});
				expect(buildErroredContentStatusChipsViewModel({
					...baseItem,
					isRetryExhausted: true,
				})).toMatchObject({
					statusColor: "volcano",
					statusLabel: "Retries exhausted",
				});
			},
		);
	},
);
