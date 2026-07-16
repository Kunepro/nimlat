// @vitest-environment node
import type {
	ImageCacheEntryReadyEvent,
	ImageDisplayTargetChangedEvent,
} from "@nimlat/busses/main";
import { Subject } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

let imageCacheEntryReadyBus: Subject<ImageCacheEntryReadyEvent>;
let imageDisplayTargetChangedBus: Subject<ImageDisplayTargetChangedEvent>;
const groupListChangedNext                   = vi.fn();
const groupMediaListChangedNext              = vi.fn();
const mediaEpisodesListChangedNext           = vi.fn();
const logMainServiceError                    = vi.fn();

describe(
	"image cache events",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			imageCacheEntryReadyBus      = new Subject<ImageCacheEntryReadyEvent>();
			imageDisplayTargetChangedBus = new Subject<ImageDisplayTargetChangedEvent>();
			vi.doMock(
				"@nimlat/busses/main",
				() => ({
					BUS_GroupListChanged:                   {
						next: groupListChangedNext,
					},
					BUS_GroupMediaListChanged:              {
						next: groupMediaListChangedNext,
					},
					BUS_ImageCacheEntryReady:               imageCacheEntryReadyBus,
					BUS_ImageDisplayTargetChanged:          imageDisplayTargetChangedBus,
					BUS_MediaEpisodesListChanged:           {
						next: mediaEpisodesListChangedNext,
					},
				}),
			);
			vi.doMock(
				"@nimlat/loggers/main",
				() => ({
					LoggerUtils: {
						logMainServiceError,
					},
				}),
			);
		});

		afterEach(async () => {
			const { disposeImageCacheEvents } = await import("./image-cache-events");
			disposeImageCacheEvents();
			vi.doUnmock("@nimlat/busses/main");
			vi.doUnmock("@nimlat/loggers/main");
		});

		it(
			"fan-outs cache readiness to the renderer invalidation bus for each display target",
			async () => {
				const { initImageCacheEvents } = await import("./image-cache-events");
				initImageCacheEvents();

				imageCacheEntryReadyBus.next({
					cacheKey:      "media:123:primary:optimized-card-v1",
					ownerKind:     "media",
					ownerId:       "123",
					imageRole:     "primary",
					displayTarget: {
						kind:    "media",
						mediaId: 123,
					},
				});
				imageCacheEntryReadyBus.next({
					cacheKey:      "official_group:456:primary:optimized-card-v1",
					ownerKind:     "official_group",
					ownerId:       "456",
					imageRole:     "primary",
					displayTarget: {
						kind:  "group",
						group: {
							source:  "official",
							groupId: 456,
						},
					},
				});
				imageCacheEntryReadyBus.next({
					cacheKey:      "episode:123:1:thumbnail:optimized-card-v1",
					ownerKind:     "episode",
					ownerId:       "123:1",
					imageRole:     "thumbnail",
					displayTarget: {
						kind:    "episode",
						mediaId: 123,
					},
				});

				expect(groupMediaListChangedNext).toHaveBeenCalledWith({ affectedMediaIds: [ 123 ] });
				expect(groupListChangedNext).toHaveBeenCalledWith({
					affectedGroups: [
						{
							source:  "official",
							groupId: 456,
						},
					],
				});
				expect(mediaEpisodesListChangedNext).toHaveBeenCalledWith({ mediaId: 123 });
				expect(logMainServiceError).not.toHaveBeenCalled();
			},
		);

		it(
			"fan-outs gallery display target changes through the same renderer invalidation policy",
			async () => {
				const { initImageCacheEvents } = await import("./image-cache-events");
				initImageCacheEvents();

				imageDisplayTargetChangedBus.next({
					reason:        "gallery-selection-changed",
					displayTarget: {
						kind:    "media",
						mediaId: 123,
					},
				});
				imageDisplayTargetChangedBus.next({
					reason:        "gallery-upload-changed",
					displayTarget: {
						kind:  "group",
						group: {
							source:  "user",
							groupId: 456,
						},
					},
				});
				imageDisplayTargetChangedBus.next({
					reason:        "gallery-upload-changed",
					displayTarget: {
						kind:    "episode",
						mediaId: 789,
					},
				});

				expect(groupMediaListChangedNext).toHaveBeenCalledWith({ affectedMediaIds: [ 123 ] });
				expect(groupListChangedNext).toHaveBeenCalledWith({
					affectedGroups: [
						{
							source:  "user",
							groupId: 456,
						},
					],
				});
				expect(mediaEpisodesListChangedNext).toHaveBeenCalledWith({ mediaId: 789 });
				expect(logMainServiceError).not.toHaveBeenCalled();
			},
		);

		it(
			"keeps gallery candidate cache readiness internal when no renderer target is attached",
			async () => {
				const { initImageCacheEvents } = await import("./image-cache-events");
				initImageCacheEvents();

				imageCacheEntryReadyBus.next({
					cacheKey:      "media:123:primary:optimized-card-v1",
					ownerKind:     "media",
					ownerId:       "123",
					imageRole:     "primary",
					displayTarget: { kind: "none" },
				});

				expect(groupMediaListChangedNext).not.toHaveBeenCalled();
				expect(groupListChangedNext).not.toHaveBeenCalled();
				expect(mediaEpisodesListChangedNext).not.toHaveBeenCalled();
			},
		);

		it(
			"does not attach duplicate image-event subscriptions",
			async () => {
				const { initImageCacheEvents } = await import("./image-cache-events");
				initImageCacheEvents();
				initImageCacheEvents();

				imageDisplayTargetChangedBus.next({
					reason:        "gallery-selection-changed",
					displayTarget: {
						kind:    "media",
						mediaId: 123,
					},
				});

				expect(groupMediaListChangedNext).toHaveBeenCalledTimes(1);
			},
		);
	},
);
