// @vitest-environment node

import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import { buildErroredContentDetailViewModel } from "./errored-content-detail-model";

const baseItem: ErroredContentItem = {
	queue:              "jikan-episodes",
	mediaId:            42,
	name:               "Serial Experiments Lain",
	queueStatus:        "failed",
	retryCount:         1,
	isHidden:           false,
	canOpenMedia:       true,
	canRetry:           true,
	isAutoRetryPlanned: false,
	isRetryExhausted:   false,
	recommendedAction:  "retry",
	fingerprint:        "jikan-episodes:42",
};

describe(
	"errored-content-detail-model",
	() => {
		it(
			"builds fallback detail rows for missing optional fields",
			() => {
				const viewModel = buildErroredContentDetailViewModel(baseItem);

				expect(viewModel.queueLabel).toBe("Episode updates");
				expect(viewModel.displayedErrorMessage).toBe("No error message was recorded.");
				expect(viewModel.detailLinks).toEqual([]);
				expect(viewModel.detailRows).toEqual(expect.arrayContaining([
					{
						label: "Catalog ID",
						value: "Not recorded",
					},
					{
						label: "Retry resumes from",
						value: "Start of queue",
					},
					{
						label: "Hidden",
						value: "No",
					},
				]));
			},
		);

		it(
			"sanitizes provider copy before exposing links",
			() => {
				const viewModel = buildErroredContentDetailViewModel({
					...baseItem,
					errorMessage: "AniList failed at https://graphql.anilist.co/v2 and mirror https://docs.example.test",
				});

				expect(viewModel.displayedErrorMessage).toContain("catalog data failed");
				expect(viewModel.displayedErrorMessage).toContain("[source URL hidden]");
				expect(viewModel.detailLinks).toEqual([ "https://docs.example.test" ]);
			},
		);
	},
);
