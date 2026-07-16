import { useEffect } from "react";
import {
	groupMediaItemsPatched,
	groupMediaListChanges,
} from "../media-inspection-runner";
import {
	createMediaLayoutPatchSnapshot,
	type MediaLayoutPatchSnapshot,
} from "../media-layout-model";

interface UseMediaLayoutSubscriptionsInput {
	mediaId: string;
	applyPatchSnapshot: (snapshot: MediaLayoutPatchSnapshot) => void;
	refreshInspectionSnapshot: () => Promise<void>;
}

export function useMediaLayoutSubscriptions({
																							mediaId,
																							applyPatchSnapshot,
																							refreshInspectionSnapshot,
																						}: UseMediaLayoutSubscriptionsInput): void {
	const numericMediaId = Number(mediaId);

	useEffect(
		() => {
			const mediaItemsPatchedSubscription = groupMediaItemsPatched().subscribe((event) => {
				const patch = event.patches.find(item => item.mediaId === numericMediaId);
				if (!patch) {
					return;
				}
				applyPatchSnapshot(createMediaLayoutPatchSnapshot(patch));
			});

			return () => {
				mediaItemsPatchedSubscription.unsubscribe();
			};
		},
		[
			applyPatchSnapshot,
			numericMediaId,
		],
	);

	useEffect(
		() => {
			const mediaListSubscription = groupMediaListChanges().subscribe((event) => {
				// React only to list change events explicitly scoped to this Media.
				if (!event.affectedMediaIds.includes(numericMediaId)) {
					return;
				}
				void refreshInspectionSnapshot();
			});

			return () => {
				mediaListSubscription.unsubscribe();
			};
		},
		[
			numericMediaId,
			refreshInspectionSnapshot,
		],
	);
}
