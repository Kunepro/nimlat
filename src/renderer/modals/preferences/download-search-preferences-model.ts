import type {
	DownloadBrowserConfig,
	DownloadBrowserMode,
	DownloadSearchProvider,
	DownloadSearchProviderCategory,
	UpdateDownloadSearchProviderRequest,
} from "@nimlat/types/download-search";
import type {
	DownloadProviderFormState,
	PreferencesModalState,
} from "../../types/modals";

export const DOWNLOAD_PROVIDER_CATEGORY_OPTIONS: Array<{
	value: DownloadSearchProviderCategory;
	label: string;
}> = [
	{
		value: "torrent",
		label: "Torrent",
	},
	{
		value: "index",
		label: "Index",
	},
];

export const PROVIDER_CATEGORY_HELP = "Torrent providers usually list torrent releases directly, often with seed/leech metadata. Index providers are broader search sites where results may include torrent pages, mirrors, or mixed download pages.";
export const PROVIDER_URL_HELP = "Full search URL template. Put {query} exactly where the encoded search text should be inserted. Legacy templates without it append the query at the end.";

const EMPTY_DOWNLOAD_PROVIDER_DRAFT: DownloadProviderFormState = {
	label:    "",
	category: "torrent",
	baseUrl:  "",
};

export function createDownloadBrowserDraftForMode(
	mode: DownloadBrowserMode,
	customPath: string,
): DownloadBrowserConfig {
	return mode === "custom"
		? {
			mode:           "custom",
			executablePath: customPath,
		}
		: { mode: "system" };
}

export function createDownloadBrowserDraftForPath(executablePath: string): DownloadBrowserConfig {
	return {
		mode: "custom",
		executablePath,
	};
}

export function getRevertedDownloadBrowserCustomPath(
	config: DownloadBrowserConfig,
	currentCustomPath: string,
): string {
	return config.executablePath ?? currentCustomPath;
}

export function updateNewDownloadProviderDraft(
	state: PreferencesModalState,
	patch: Partial<DownloadProviderFormState>,
): PreferencesModalState {
	return {
		...state,
		newDownloadProvider: {
			...state.newDownloadProvider,
			...patch,
		},
	};
}

export function updateEditDownloadProviderDraft(
	state: PreferencesModalState,
	patch: Partial<DownloadProviderFormState>,
): PreferencesModalState {
	return {
		...state,
		editDownloadProvider: {
			...state.editDownloadProvider,
			...patch,
		},
	};
}

export function toggleAddingDownloadProviderForm(state: PreferencesModalState): PreferencesModalState {
	return {
		...state,
		isAddingDownloadProvider:  !state.isAddingDownloadProvider,
		editingDownloadProviderId: null,
	};
}

export function cancelAddingDownloadProviderForm(state: PreferencesModalState): PreferencesModalState {
	return {
		...state,
		isAddingDownloadProvider: false,
	};
}

export function setDownloadProviderEnabled(
	state: PreferencesModalState,
	providerId: string,
	enabled: boolean,
): PreferencesModalState {
	return {
		...state,
		downloadProviders: state.downloadProviders.map((provider) => provider.id === providerId
			? {
				...provider,
				enabled,
			}
			: provider),
	};
}

export function appendCreatedDownloadProvider(
	state: PreferencesModalState,
	provider: DownloadSearchProvider,
): PreferencesModalState {
	return {
		...state,
		downloadProviders:        [
			...state.downloadProviders,
			provider,
		],
		isAddingDownloadProvider: false,
		newDownloadProvider:      EMPTY_DOWNLOAD_PROVIDER_DRAFT,
	};
}

export function startEditingDownloadProviderDraft(
	state: PreferencesModalState,
	providerId: string,
): PreferencesModalState {
	const provider = state.downloadProviders.find((candidate) => candidate.id === providerId);
	if (!provider) {
		return state;
	}

	return {
		...state,
		isAddingDownloadProvider:  false,
		editingDownloadProviderId: provider.id,
		editDownloadProvider:      {
			label:    provider.label,
			category: provider.category,
			baseUrl:  provider.baseUrl,
		},
	};
}

export function cancelEditingDownloadProviderDraft(state: PreferencesModalState): PreferencesModalState {
	return {
		...state,
		editingDownloadProviderId: null,
		editDownloadProvider:      EMPTY_DOWNLOAD_PROVIDER_DRAFT,
	};
}

export function replaceUpdatedDownloadProvider(
	state: PreferencesModalState,
	provider: DownloadSearchProvider,
): PreferencesModalState {
	return {
		...state,
		downloadProviders:         state.downloadProviders.map((candidate) => candidate.id === provider.id
			? provider
			: candidate),
		editingDownloadProviderId: null,
		editDownloadProvider:      EMPTY_DOWNLOAD_PROVIDER_DRAFT,
	};
}

export function createDownloadProviderUpdateRequest(
	providerId: string,
	draft: DownloadProviderFormState,
): UpdateDownloadSearchProviderRequest {
	return {
		providerId,
		...draft,
	};
}

export function removeDownloadProvider(
	state: PreferencesModalState,
	providerId: string,
): PreferencesModalState {
	return {
		...state,
		downloadProviders:         state.downloadProviders.filter((provider) => provider.id !== providerId),
		editingDownloadProviderId: state.editingDownloadProviderId === providerId
																 ? null
																 : state.editingDownloadProviderId,
	};
}

export function updateDownloadBrowserModeDraft(
	state: PreferencesModalState,
	mode: DownloadBrowserMode,
): PreferencesModalState {
	return {
		...state,
		downloadBrowserDraft: createDownloadBrowserDraftForMode(
			mode,
			state.downloadBrowserCustomPath,
		),
	};
}

export function updateDownloadBrowserCustomPathDraft(
	state: PreferencesModalState,
	path: string,
): PreferencesModalState {
	return {
		...state,
		downloadBrowserCustomPath: path,
		downloadBrowserDraft:      createDownloadBrowserDraftForPath(path),
	};
}

export function commitDownloadBrowserConfig(
	state: PreferencesModalState,
	config: DownloadBrowserConfig,
): PreferencesModalState {
	return {
		...state,
		downloadBrowserConfig: config,
		downloadBrowserDraft:  config,
	};
}

export function applyPickedDownloadBrowserExecutable(
	state: PreferencesModalState,
	executablePath: string,
): PreferencesModalState {
	return {
		...state,
		downloadBrowserCustomPath: executablePath,
		downloadBrowserDraft:      createDownloadBrowserDraftForPath(executablePath),
	};
}

export function revertDownloadBrowserDraftChanges(state: PreferencesModalState): PreferencesModalState {
	return {
		...state,
		downloadBrowserDraft:      state.downloadBrowserConfig,
		downloadBrowserCustomPath: getRevertedDownloadBrowserCustomPath(
			state.downloadBrowserConfig,
			state.downloadBrowserCustomPath,
		),
	};
}
