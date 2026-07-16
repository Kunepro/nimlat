import { useEffect } from "react";
import {
	libraryGroupListChanges,
	libraryGroupMediaItemsPatched,
	libraryGroupMediaListChanges,
	libraryPreferredTitleLanguageChanges,
} from "../library-wall-invalidation-runner";

interface UseLibraryWallInvalidationSubscriptionsInput {
	requestBackgroundWallReload: () => void;
	requestWallReload: () => void;
}

export function useLibraryWallInvalidationSubscriptions({
																													requestBackgroundWallReload,
																													requestWallReload,
																												}: UseLibraryWallInvalidationSubscriptionsInput): void {
	useEffect(
		() => {
			const refreshCurrentWallFromBackgroundEvent = () => {
				requestBackgroundWallReload();
			};

			const groupListSubscription              = libraryGroupListChanges().subscribe(refreshCurrentWallFromBackgroundEvent);
			const groupMediaListSubscription         = libraryGroupMediaListChanges().subscribe(refreshCurrentWallFromBackgroundEvent);
			const groupMediaItemsPatchedSubscription = libraryGroupMediaItemsPatched().subscribe(refreshCurrentWallFromBackgroundEvent);
			const preferredTitleLanguageSubscription = libraryPreferredTitleLanguageChanges().subscribe(() => {
				requestWallReload();
			});

			return () => {
				groupListSubscription.unsubscribe();
				groupMediaListSubscription.unsubscribe();
				groupMediaItemsPatchedSubscription.unsubscribe();
				preferredTitleLanguageSubscription.unsubscribe();
			};
		},
		[
			requestBackgroundWallReload,
			requestWallReload,
		],
	);
}
