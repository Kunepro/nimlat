import {
	DEFAULT_BACKGROUND_STYLE,
	DEFAULT_PREFERRED_TITLE_LANGUAGE,
} from "@nimlat/types/user-config";
import {
	atom,
	useAtom,
	useSetAtom,
} from "jotai";
import { useCallback } from "react";
import type { PreferencesModalState } from "../../types/modals";

const preferencesModalState = atom<PreferencesModalState>({
	isOpen:                     false,
	isAdultContentEnabled:      false,
	backgroundStyle:            DEFAULT_BACKGROUND_STYLE,
	preferredTitleLanguage: DEFAULT_PREFERRED_TITLE_LANGUAGE,
	isDevModeEnabled:           false,
	isCanvasDiagnosticsEnabled: false,
	downloadBrowserConfig:      { mode: "system" },
	downloadBrowserDraft:       { mode: "system" },
	downloadBrowserCustomPath:  "",
	downloadProviders:          [],
	isAddingDownloadProvider:   false,
	editingDownloadProviderId:  null,
	newDownloadProvider:        {
		label:    "",
		category: "torrent",
		baseUrl:  "",
	},
	editDownloadProvider:       {
		label:    "",
		category: "torrent",
		baseUrl:  "",
	},
});

export const usePreferencesModalState = () => useAtom(preferencesModalState);

export const useOpenPreferencesModal = () => {
	const setState = useSetAtom(preferencesModalState);

	return useCallback(
		() => {
			setState((prevState: PreferencesModalState) => ({
				...prevState,
				isOpen: true,
			}));
		},
		[ setState ],
	);
};

export const useClosePreferencesModal = () => {
	const setState = useSetAtom(preferencesModalState);

	return useCallback(
		() => {
			setState((prevState: PreferencesModalState) => ({
				...prevState,
				isOpen: false,
			}));
		},
		[ setState ],
	);
};
