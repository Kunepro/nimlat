import type { GroupMediaItemsPatchedEvent } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { useEffect } from "react";
import {
	shouldApplyGroupMediaPatchEvent,
	shouldRefreshGroupMediaForListChange,
} from "../group-media-explorer-model";
import {
	groupMediaItemsPatched,
	groupMediaListChanges,
	groupMediaPreferredTitleLanguageChanges,
} from "../group-media-subscriptions-runner";

interface GroupMediaSubscriptionsOptions {
	applyWatchStatePatches: (patches: GroupMediaItemsPatchedEvent["patches"]) => void;
	groupRef: GroupRef | null;
	loadedMediaIds: ReadonlySet<number>;
	loadSummary: (showLoader?: boolean) => Promise<void>;
	patchSelectedMedias: (patches: GroupMediaItemsPatchedEvent["patches"]) => void;
	requestWallReload: (showInitialLoader?: boolean) => void;
}

export function useGroupMediaSubscriptions({
																						 applyWatchStatePatches,
																						 groupRef,
																						 loadedMediaIds,
																						 loadSummary,
																						 patchSelectedMedias,
																						 requestWallReload,
																					 }: GroupMediaSubscriptionsOptions): void {
	useEffect(
		() => {
			if (!groupRef) {
				return undefined;
			}
			const groupMediaListSubscription = groupMediaListChanges().subscribe((event) => {
				if (!shouldRefreshGroupMediaForListChange(
					groupRef,
					event,
				)) {
					return;
				}
				void loadSummary(false);
				requestWallReload();
			});

			return () => {
				groupMediaListSubscription.unsubscribe();
			};
		},
		[
			groupRef,
			loadSummary,
			requestWallReload,
		],
	);

	useEffect(
		() => {
			if (!groupRef) {
				return undefined;
			}
			const groupMediaPatchSubscription = groupMediaItemsPatched().subscribe((event) => {
				if (!shouldApplyGroupMediaPatchEvent(
					groupRef,
					event,
				)) {
					return;
				}
				// Item patches are the immediate renderer contract. The reload below
				// remains the SQLite-backed reconciliation for off-screen cards and sort.
				applyWatchStatePatches(event.patches.filter(patch => loadedMediaIds.has(patch.mediaId)));
				patchSelectedMedias(event.patches);
				requestWallReload();
			});

			return () => {
				groupMediaPatchSubscription.unsubscribe();
			};
		},
		[
			applyWatchStatePatches,
			groupRef,
			loadedMediaIds,
			patchSelectedMedias,
			requestWallReload,
		],
	);

	useEffect(
		() => {
			if (!groupRef) {
				return undefined;
			}
			const titleLanguageSubscription = groupMediaPreferredTitleLanguageChanges().subscribe(() => {
				void loadSummary(false);
				requestWallReload();
			});

			return () => {
				titleLanguageSubscription.unsubscribe();
			};
		},
		[
			groupRef,
			loadSummary,
			requestWallReload,
		],
	);
}
