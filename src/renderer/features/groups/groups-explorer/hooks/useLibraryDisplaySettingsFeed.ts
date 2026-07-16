import type {
	LibraryAdultFilter,
	LibraryDisplayFilters,
	LibraryDisplayMode,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";
import type { MutableRefObject } from "react";
import { useEffect } from "react";
import {
	resolveLibraryAdultContentStatusChange,
	resolveLibraryDisplaySettingsLoad,
} from "../library-display-settings-model";
import {
	getLibraryAdultContentStatus,
	getLibraryDisplayFilters,
	libraryAdultContentStatusChanges,
	listLibraryFilterOptions,
} from "../library-display-settings-runner";

interface UseLibraryDisplaySettingsFeedInput {
	commitDisplayMode: (nextMode: LibraryDisplayMode) => void;
	displayModeRef: MutableRefObject<LibraryDisplayMode>;
	notifyLibraryDisplaySettingsError: (error: unknown, fallbackMessage: string) => void;
	persistLibraryFilters: (nextFilters: LibraryDisplayFilters) => void;
	requestWallReload: () => void;
	setAdultContentEnabled: (enabled: boolean) => void;
	setAdultFilter: (filter: LibraryAdultFilter) => void;
	setFilterOptions: (options: LibraryFilterOptions) => void;
}

// Owns the reactive read side for library settings: initial facade reads plus
// adult-content status events. Each event resolves its own state transition.
export function useLibraryDisplaySettingsFeed({
																								commitDisplayMode,
																								displayModeRef,
																								notifyLibraryDisplaySettingsError,
																								persistLibraryFilters,
																								requestWallReload,
																								setAdultContentEnabled,
																								setAdultFilter,
																								setFilterOptions,
																							}: UseLibraryDisplaySettingsFeedInput): void {
	useEffect(
		() => {
			let isMounted                  = true;
			const updateAdultContentStatus = (enabled: boolean) => {
				if (!isMounted) {
					return;
				}
				const resolved = resolveLibraryAdultContentStatusChange(
					enabled,
					displayModeRef.current,
				);
				setAdultContentEnabled(resolved.isAdultContentEnabled);
				if (resolved.adultFilter !== null) {
					setAdultFilter(resolved.adultFilter);
				}
				if (resolved.filtersToPersist) {
					persistLibraryFilters(resolved.filtersToPersist);
				}
				requestWallReload();
			};

			void Promise.all([
				getLibraryAdultContentStatus(),
				getLibraryDisplayFilters(),
				listLibraryFilterOptions(),
			])
				.then(([ enabled, filters, options ]) => {
					if (!isMounted) {
						return;
					}
					const resolved = resolveLibraryDisplaySettingsLoad({
						adultContentEnabled: enabled,
						filters,
						filterOptions:       options,
					});
					setAdultContentEnabled(resolved.settings.isAdultContentEnabled);
					setAdultFilter(resolved.settings.adultFilter);
					commitDisplayMode(resolved.settings.displayMode);
					setFilterOptions(resolved.settings.filterOptions);
					if (resolved.filtersToPersist) {
						persistLibraryFilters(resolved.filtersToPersist);
					}
					requestWallReload();
				})
				.catch((error: unknown) => {
					if (!isMounted) {
						return;
					}
					notifyLibraryDisplaySettingsError(
						error,
						"Failed to load library display settings.",
					);
					requestWallReload();
				});

			const adultContentSubscription = libraryAdultContentStatusChanges().subscribe(updateAdultContentStatus);

			return () => {
				isMounted = false;
				adultContentSubscription.unsubscribe();
			};
		},
		[
			commitDisplayMode,
			displayModeRef,
			notifyLibraryDisplaySettingsError,
			persistLibraryFilters,
			requestWallReload,
			setAdultContentEnabled,
			setAdultFilter,
			setFilterOptions,
		],
	);
}
