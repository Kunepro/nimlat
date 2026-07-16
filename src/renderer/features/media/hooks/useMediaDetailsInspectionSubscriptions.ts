import { useEffect } from "react";
import {
	groupMediaListChanges,
	mediaEpisodesListChanges,
	preferredTitleLanguageChanges,
} from "../media-inspection-runner";

interface MediaDetailsInspectionSubscriptionsInput {
	numericMediaId: number;
	refreshMedia: (showLoader?: boolean) => Promise<void>;
}

// Connects independent renderer event streams to the compact details snapshot.
// Each stream owns its filtering, preserving reactive isolation between domains.
export function useMediaDetailsInspectionSubscriptions({
																												 numericMediaId,
																												 refreshMedia,
																											 }: MediaDetailsInspectionSubscriptionsInput): void {
	useEffect(
		() => {
			void refreshMedia(true);
		},
		[ refreshMedia ],
	);

	useEffect(
		() => {
			const groupMediaListSubscription = groupMediaListChanges().subscribe((event) => {
				if (!event.affectedMediaIds.includes(numericMediaId)) {
					return;
				}
				void refreshMedia(false);
			});

			return () => {
				groupMediaListSubscription.unsubscribe();
			};
		},
		[
			numericMediaId,
			refreshMedia,
		],
	);

	useEffect(
		() => {
			// Episode counts in the inspection payload are derived from both AniList
			// catalog values and finalized episode rows, so hydration events must re-read it.
			const mediaEpisodesSubscription = mediaEpisodesListChanges().subscribe((event) => {
				if (event.mediaId !== numericMediaId) {
					return;
				}
				void refreshMedia(false);
			});

			return () => {
				mediaEpisodesSubscription.unsubscribe();
			};
		},
		[
			numericMediaId,
			refreshMedia,
		],
	);

	useEffect(
		() => {
			const titleLanguageSubscription = preferredTitleLanguageChanges().subscribe(() => {
				void refreshMedia(false);
			});

			return () => {
				titleLanguageSubscription.unsubscribe();
			};
		},
		[ refreshMedia ],
	);
}
