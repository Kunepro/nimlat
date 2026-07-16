// @vitest-environment jsdom

import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { HydratorFacade } from "../../facades";
import {
	hideErroredContentItem,
	listErroredContentPage,
	reportErroredContentItem,
	retryAllErroredContentItems,
	retryErroredContentItem,
	subscribeToErroredContentQueueChanges,
} from "./errored-content-runner";

const item: ErroredContentItem = {
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
	"errored-content-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads failed content pages and subscribes to queue changes through the hydrator facade",
			async () => {
				const queueChanges$ = new Subject<void>();
				const listener      = vi.fn();
				vi.spyOn(
					HydratorFacade,
					"listErroredContent",
				).mockResolvedValue({
					items:      [ item ],
					nextOffset: null,
					total:      1,
				});
				vi.spyOn(
					HydratorFacade,
					"queueChanges",
				).mockReturnValue(queueChanges$);

				await expect(listErroredContentPage(
					0,
					50,
					"characters",
					true,
				)).resolves.toEqual({
					items:      [ item ],
					nextOffset: null,
					total:      1,
				});

				const subscription = subscribeToErroredContentQueueChanges(listener);
				queueChanges$.next();

				expect(listener).toHaveBeenCalledTimes(1);
				expect(HydratorFacade.listErroredContent).toHaveBeenCalledWith(
					0,
					50,
					"characters",
					true,
				);
				expect(HydratorFacade.queueChanges).toHaveBeenCalledTimes(1);

				subscription.unsubscribe();
			},
		);

		it(
			"runs item actions with queue and media id payloads",
			async () => {
				vi.spyOn(
					HydratorFacade,
					"retryErroredContent",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					HydratorFacade,
					"hideErroredContent",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					HydratorFacade,
					"reportErroredContent",
				).mockResolvedValue({
					success:     true,
					fingerprint: "characters:86",
					reportUrl:   "https://github.example/issues/new",
				});

				await expect(retryErroredContentItem(item)).resolves.toEqual({ success: true });
				await expect(hideErroredContentItem(item)).resolves.toEqual({ success: true });
				await expect(reportErroredContentItem(item)).resolves.toMatchObject({
					success:     true,
					fingerprint: "characters:86",
				});

				const expectedPayload = {
					queue:   "characters",
					mediaId: 86,
				};
				expect(HydratorFacade.retryErroredContent).toHaveBeenCalledWith(expectedPayload);
				expect(HydratorFacade.hideErroredContent).toHaveBeenCalledWith(expectedPayload);
				expect(HydratorFacade.reportErroredContent).toHaveBeenCalledWith(expectedPayload);
			},
		);

		it(
			"runs retry-all through the hydrator facade with the active queue filter",
			async () => {
				vi.spyOn(
					HydratorFacade,
					"retryAllErroredContent",
				).mockResolvedValue({
					success:      true,
					retriedCount: 2,
				});

				await expect(retryAllErroredContentItems("characters")).resolves.toEqual({
					success:      true,
					retriedCount: 2,
				});
				await expect(retryAllErroredContentItems(null)).resolves.toEqual({
					success:      true,
					retriedCount: 2,
				});

				expect(HydratorFacade.retryAllErroredContent).toHaveBeenCalledWith("characters");
				expect(HydratorFacade.retryAllErroredContent).toHaveBeenCalledWith(null);
			},
		);
	},
);
