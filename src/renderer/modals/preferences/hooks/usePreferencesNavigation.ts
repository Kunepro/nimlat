import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { ROUTES } from "../../../constants/route-config";

interface UsePreferencesNavigationInput {
	closePreferencesModal: () => void;
}

interface UsePreferencesNavigationResult {
	openAnimeDbDownload: () => void;
	openAnimeDbScanner: () => void;
	openIgnoredContent: () => void;
}

export function usePreferencesNavigation({
																					 closePreferencesModal,
																				 }: UsePreferencesNavigationInput): UsePreferencesNavigationResult {
	const navigate = useNavigate();

	const openAnimeDbDownload = useCallback(
		() => {
			closePreferencesModal();
			void navigate({ to: ROUTES.DOWNLOAD_PRECACHED_ANIME_DB });
		},
		[
			closePreferencesModal,
			navigate,
		],
	);

	const openIgnoredContent = useCallback(
		() => {
			closePreferencesModal();
			void navigate({ to: ROUTES.GROUPS.IGNORED_FULL_URL });
		},
		[
			closePreferencesModal,
			navigate,
		],
	);
	const openAnimeDbScanner = useCallback(
		() => {
			closePreferencesModal();
			void navigate({ to: ROUTES.POPULATE_ANIME_DB });
		},
		[
			closePreferencesModal,
			navigate,
		],
	);

	return {
		openAnimeDbDownload,
		openAnimeDbScanner,
		openIgnoredContent,
	};
}
