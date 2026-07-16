import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordPreset,
	DownloadSearchProvider,
	DownloadSearchQueryPreset,
} from "@nimlat/types/download-search";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { MediaDownloadInspection } from "../../../../types/media-download";
import { formatMediaDownloadActionError } from "../media-download-action-model";
import {
	loadDownloadSearchSettings,
	loadMediaDownloadInitialState,
	saveMediaDownloadBuilderState,
	subscribeToDownloadSearchSettingsChanges,
} from "../media-download-explorer-runner";
import {
	createDownloadSearchSettingsSnapshot,
	createMediaDownloadInitialStateSnapshot,
	DEFAULT_DOWNLOAD_SEARCH_BUILDER_STATE,
	type DownloadSearchSettingsSnapshot,
} from "../media-download-settings-model";

interface DownloadSearchSettingsState {
	builderState: DownloadSearchBuilderState;
	errorMessage: string | null;
	isLoading: boolean;
	media: MediaDownloadInspection;
	presets: DownloadSearchKeywordPreset[];
	providers: DownloadSearchProvider[];
	queryPresets: DownloadSearchQueryPreset[];
	titleDraft: string;
	setBuilderState: Dispatch<SetStateAction<DownloadSearchBuilderState>>;
	setMedia: Dispatch<SetStateAction<MediaDownloadInspection>>;
	setQueryPresets: Dispatch<SetStateAction<DownloadSearchQueryPreset[]>>;
	setTitleDraft: Dispatch<SetStateAction<string>>;
}

export function useDownloadSearchSettingsState(
	numericMediaId: number,
	setActionError: Dispatch<SetStateAction<string | null>>,
): DownloadSearchSettingsState {
	const [ media, setMedia ]               = useState<MediaDownloadInspection>(null);
	const [ providers, setProviders ]       = useState<DownloadSearchProvider[]>([]);
	const [ presets, setPresets ]           = useState<DownloadSearchKeywordPreset[]>([]);
	const [ queryPresets, setQueryPresets ] = useState<DownloadSearchQueryPreset[]>([]);
	const [ builderState, setBuilderState ] = useState<DownloadSearchBuilderState>(DEFAULT_DOWNLOAD_SEARCH_BUILDER_STATE);
	const [ isLoading, setLoading ]         = useState(true);
	const [ errorMessage, setErrorMessage ] = useState<string | null>(null);
	const [ titleDraft, setTitleDraft ]     = useState("");
	const saveBuilderStateRequestIdRef      = useRef(0);

	const applyDownloadSearchSettingsSnapshot = useCallback(
		(snapshot: DownloadSearchSettingsSnapshot) => {
			setProviders(snapshot.providers);
			setPresets(snapshot.presets);
			setQueryPresets(snapshot.queryPresets);
		},
		[],
	);

	const loadInitialDownloadSearchState = useCallback(
		async (cancelled: () => boolean): Promise<void> => {
			try {
				setLoading(true);
				setErrorMessage(null);
				const {
								media: nextMedia,
								settings,
							} = await loadMediaDownloadInitialState(numericMediaId);
				if (cancelled()) {
					return;
				}
				const snapshot = createMediaDownloadInitialStateSnapshot(
					nextMedia,
					settings,
				);
				setMedia(snapshot.media);
				applyDownloadSearchSettingsSnapshot(snapshot);
				setBuilderState(snapshot.builderState);
				setTitleDraft(snapshot.titleDraft);
			} catch (error) {
				if (!cancelled()) {
					setErrorMessage(formatMediaDownloadActionError(
						error,
						"Failed to load download search.",
					));
				}
			} finally {
				if (!cancelled()) {
					setLoading(false);
				}
			}
		},
		[
			applyDownloadSearchSettingsSnapshot,
			numericMediaId,
		],
	);

	useEffect(
		() => {
			let cancelled = false;
			void loadInitialDownloadSearchState(() => cancelled);
			return () => {
				cancelled = true;
			};
		},
		[ loadInitialDownloadSearchState ],
	);

	useEffect(
		() => {
			let cancelled                 = false;
			const refreshDownloadSettings = () => {
				loadDownloadSearchSettings()
					.then((settings) => {
						if (!cancelled) {
							applyDownloadSearchSettingsSnapshot(createDownloadSearchSettingsSnapshot(settings));
						}
					})
					.catch((error: unknown) => {
						if (!cancelled) {
							setActionError(formatMediaDownloadActionError(
								error,
								"Failed to refresh download search settings.",
							));
						}
					});
			};

			const subscription = subscribeToDownloadSearchSettingsChanges(refreshDownloadSettings);
			return () => {
				cancelled = true;
				subscription.unsubscribe();
			};
		},
		[
			applyDownloadSearchSettingsSnapshot,
			setActionError,
		],
	);

	useEffect(
		() => {
			if (isLoading) {
				return;
			}

			// Autosaves can overlap while the user edits; only the latest failed request should surface an error.
			const requestId                      = saveBuilderStateRequestIdRef.current + 1;
			saveBuilderStateRequestIdRef.current = requestId;
			saveMediaDownloadBuilderState(
				numericMediaId,
				builderState,
			).catch((error: unknown) => {
				if (saveBuilderStateRequestIdRef.current === requestId) {
					setActionError(formatMediaDownloadActionError(
						error,
						"Failed to save download search builder.",
					));
				}
			});
		},
		[
			builderState,
			isLoading,
			numericMediaId,
			setActionError,
		],
	);

	return {
		builderState,
		errorMessage,
		isLoading,
		media,
		presets,
		providers,
		queryPresets,
		titleDraft,
		setBuilderState,
		setMedia,
		setQueryPresets,
		setTitleDraft,
	};
}
