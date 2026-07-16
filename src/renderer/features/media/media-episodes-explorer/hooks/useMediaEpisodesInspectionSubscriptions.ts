import type { MediaInspectionData } from "@nimlat/types/ipc-payloads";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import { useEffect } from "react";
import {
	mediaEpisodesItemsPatched,
	mediaEpisodesListChanges,
	preferredTitleLanguageChanges,
} from "../../media-inspection-runner";
import {
	patchMediaEpisodesFromEvent,
	shouldApplyMediaEpisodesPatchEvent,
	shouldRefreshMediaEpisodesForListChange,
} from "../media-episodes-explorer-model";

interface MediaEpisodesInspectionSubscriptionsInput {
	mediaIdNumber: number;
	refreshMedia: (showLoader?: boolean) => Promise<void>;
	setMedia: Dispatch<SetStateAction<MediaInspectionData | null>>;
}

// Connects independent renderer event streams to the episode snapshot. Each
// stream filters only the actions it owns, keeping the hook reactive and local.
export function useMediaEpisodesInspectionSubscriptions({
																													mediaIdNumber,
																													refreshMedia,
																													setMedia,
																												}: MediaEpisodesInspectionSubscriptionsInput): void {
	useEffect(
		() => {
			// Initial load for the active Media details/episodes payload.
			void refreshMedia(true);
		},
		[ refreshMedia ],
	);

	useEffect(
		() => {
			// Episodes list structure changed for this Media (new/deleted rows): re-fetch snapshot.
			const mediaEpisodesSubscription = mediaEpisodesListChanges().subscribe((event) => {
				if (!shouldRefreshMediaEpisodesForListChange(
					mediaIdNumber,
					event,
				)) {
					return;
				}
				void refreshMedia(false);
			});

			return () => {
				mediaEpisodesSubscription.unsubscribe();
			};
		},
		[
			mediaIdNumber,
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

	useEffect(
		() => {
			// Item patches keep virtualized rows in sync without paying for a full episode snapshot reload.
			const mediaEpisodesPatchSubscription = mediaEpisodesItemsPatched().subscribe((event) => {
				if (!shouldApplyMediaEpisodesPatchEvent(
					mediaIdNumber,
					event,
				)) {
					return;
				}
				setMedia(currentMedia => patchMediaEpisodesFromEvent(
					currentMedia,
					event,
				));
			});

			return () => {
				mediaEpisodesPatchSubscription.unsubscribe();
			};
		},
		[
			mediaIdNumber,
			setMedia,
		],
	);
}
