import type { AppUpdateStatus } from "@nimlat/types/app-update";
import { useMemo } from "react";
import { createAppUpdatePreferencesViewModel } from "../app-update-preferences-model";
import { useAnimeDbReleaseStatus } from "./useAnimeDbReleaseStatus";
import { useAppUpdateActions } from "./useAppUpdateActions";
import { useAppUpdateStatus } from "./useAppUpdateStatus";

interface UseAppUpdatePreferencesControllerResult {
	animeDbReleaseErrorMessage: string | null;
	animeDbReleaseStatusMessage: string;
	currentVersion: string;
	installedAnimeDbVersion: string;
	isActionRunning: boolean;
	isAnimeDbReleaseStatusLoading: boolean;
	isChecking: boolean;
	isDownloading: boolean;
	latestAnimeDbVersion: string;
	latestPublishedAppVersion: string;
	status: AppUpdateStatus | null;
	statusMessage: string;
	updateAppLabel: string;
	canDownloadAnimeDb: boolean;
	canUpdateApp: boolean;
	checkAnimeDbReleaseStatus: () => void;
	checkForUpdates: () => void;
	updateApp: () => void;
}

export function useAppUpdatePreferencesController(isPreferencesOpen = true): UseAppUpdatePreferencesControllerResult {
	const {
					status,
					setStatus,
				}                       = useAppUpdateStatus();
	const {
					animeDbReleaseStatus,
					isAnimeDbReleaseStatusLoading,
					checkAnimeDbReleaseStatus,
				} = useAnimeDbReleaseStatus(isPreferencesOpen);
	const {
					isActionRunning,
					checkForUpdates,
					updateApp,
				}                       = useAppUpdateActions({
		status,
		setStatus,
	});
	const viewModel               = useMemo(
		() => createAppUpdatePreferencesViewModel({
			animeDbReleaseStatus,
			isActionRunning,
			isAnimeDbReleaseStatusLoading,
			status,
		}),
		[
			animeDbReleaseStatus,
			isActionRunning,
			isAnimeDbReleaseStatusLoading,
			status,
		],
	);

	return {
		...viewModel,
		checkAnimeDbReleaseStatus,
		checkForUpdates,
		updateApp,
	};
}
