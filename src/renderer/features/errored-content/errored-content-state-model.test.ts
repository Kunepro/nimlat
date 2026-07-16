// @vitest-environment node

import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import { ROUTES } from "../../constants/route-config";
import {
	addPendingActionKey,
	createErroredContentMediaNavigationTarget,
	formatErroredContentActionError,
	getErroredContentQueueFilter,
	getRetryAllSuccessMessage,
	getVisibleErroredContentItems,
	mergeErroredContentPageItems,
	removePendingActionKey,
} from "./errored-content-state-model";

function createItem(
	name: string,
	mediaId: number = name.length,
): ErroredContentItem {
	return {
		queue:              "characters",
		mediaId,
		name,
		queueStatus:        "failed",
		retryCount:         1,
		isHidden:           false,
		canOpenMedia:       true,
		canRetry:           true,
		isAutoRetryPlanned: false,
		isRetryExhausted:   false,
		recommendedAction:  "retry",
		fingerprint:        `characters:${ name.length }`,
	};
}

describe(
	"errored content state model",
	() => {
		it(
			"maps the all filter to an unscoped queue request",
			() => {
				expect(getErroredContentQueueFilter("all")).toBeNull();
				expect(getErroredContentQueueFilter("characters")).toBe("characters");
			},
		);

		it(
			"maintains unique pending action keys",
			() => {
				expect(addPendingActionKey(
					[ "a" ],
					"a",
				)).toEqual([ "a" ]);
				expect(addPendingActionKey(
					[ "a" ],
					"b",
				)).toEqual([
					"a",
					"b",
				]);
				expect(removePendingActionKey(
					[
						"a",
						"b",
					],
					"a",
				)).toEqual([ "b" ]);
			},
		);

		it(
			"builds retry-all success messages",
			() => {
				expect(getRetryAllSuccessMessage(0)).toBe("No retryable failed items found.");
				expect(getRetryAllSuccessMessage(1)).toBe("Queued 1 item for retry.");
				expect(getRetryAllSuccessMessage(3)).toBe("Queued 3 items for retry.");
			},
		);

		it(
			"filters and sorts visible items by case-insensitive name",
			() => {
				expect(getVisibleErroredContentItems(
					[
						createItem("Monster"),
						createItem("Akira"),
						createItem("banana Fish"),
					],
					"a",
				).map(item => item.name)).toEqual([
					"Akira",
					"banana Fish",
				]);
			},
		);

		it(
			"replaces first pages and appends later pages",
			() => {
				const firstPage  = [
					createItem(
						"Akira",
						1,
					),
				];
				const secondPage = [
					createItem(
						"Monster",
						2,
					),
				];

				expect(mergeErroredContentPageItems(
					[ createItem("Old item") ],
					firstPage,
					0,
				)).toEqual(firstPage);
				expect(mergeErroredContentPageItems(
					firstPage,
					secondPage,
					50,
				)).toEqual([
					...firstPage,
					...secondPage,
				]);
			},
		);

		it(
			"builds media navigation targets with route state hints",
			() => {
				const target      = createErroredContentMediaNavigationTarget(createItem(
					"Texhnolyze",
					86,
				));
				const updateState = target.state as (previousState: Record<string, unknown>) => Record<string, unknown>;

				expect(target.to).toBe(ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS_FULL_URL);
				expect(target.params).toEqual({ mediaId: "86" });
				expect(updateState({ key: "existing" })).toEqual({
					key:       "existing",
					mediaName: "Texhnolyze",
				});
			},
		);

		it(
			"formats unknown action errors with a safe fallback",
			() => {
				expect(formatErroredContentActionError(
					new Error("boom"),
					"fallback",
				)).toBe("boom");
				expect(formatErroredContentActionError(
					{ message: "not trusted" },
					"fallback",
				)).toBe("fallback");
			},
		);
	},
);
