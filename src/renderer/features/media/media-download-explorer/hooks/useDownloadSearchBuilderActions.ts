import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordCategory,
	DownloadSearchKeywordPreset,
	DownloadSearchTitleLanguage,
} from "@nimlat/types/download-search";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import { useCallback } from "react";
import type { MediaDownloadInspection } from "../../../../types/media-download";
import {
	createDownloadSearchTitleDraftForLanguage,
	replaceDownloadSearchAudioCodecPreset,
	replaceDownloadSearchCategoryPreset,
	setDownloadSearchBuilderCustomQueryText,
	setDownloadSearchBuilderTitleLanguage,
	toggleDownloadSearchAudioFlagPreset,
} from "../media-download-builder-state-model";

interface DownloadSearchBuilderActionsInput {
	media: MediaDownloadInspection;
	presets: DownloadSearchKeywordPreset[];
	setBuilderState: Dispatch<SetStateAction<DownloadSearchBuilderState>>;
	setTitleDraft: Dispatch<SetStateAction<string>>;
}

interface DownloadSearchBuilderActions {
	replaceAudioCodec: (nextPresetId: string | undefined) => void;
	replaceCategoryPreset: (category: DownloadSearchKeywordCategory, nextPresetId: string | undefined) => void;
	setCustomQueryText: (value: string) => void;
	setTitleLanguage: (titleLanguage: DownloadSearchTitleLanguage) => void;
	toggleAudioFlag: (value: string, enabled: boolean) => void;
}

export function useDownloadSearchBuilderActions({
																									media,
																									presets,
																									setBuilderState,
																									setTitleDraft,
																								}: DownloadSearchBuilderActionsInput): DownloadSearchBuilderActions {
	const replaceCategoryPreset = useCallback(
		(category: DownloadSearchKeywordCategory, nextPresetId: string | undefined) => {
			setBuilderState((current) => replaceDownloadSearchCategoryPreset(
				current,
				presets,
				category,
				nextPresetId,
			));
		},
		[
			presets,
			setBuilderState,
		],
	);

	const replaceAudioCodec = useCallback(
		(nextPresetId: string | undefined) => {
			setBuilderState((current) => replaceDownloadSearchAudioCodecPreset(
				current,
				presets,
				nextPresetId,
			));
		},
		[
			presets,
			setBuilderState,
		],
	);

	const toggleAudioFlag = useCallback(
		(value: string, enabled: boolean) => {
			setBuilderState((current) => toggleDownloadSearchAudioFlagPreset(
				current,
				presets,
				value,
				enabled,
			));
		},
		[
			presets,
			setBuilderState,
		],
	);

	const setTitleLanguage = useCallback(
		(titleLanguage: DownloadSearchTitleLanguage) => {
			const titleDraft = createDownloadSearchTitleDraftForLanguage(
				media,
				titleLanguage,
			);
			if (titleDraft === null) {
				return;
			}
			setBuilderState((current) => setDownloadSearchBuilderTitleLanguage(
				current,
				titleLanguage,
			));
			setTitleDraft(titleDraft);
		},
		[
			media,
			setBuilderState,
			setTitleDraft,
		],
	);

	const setCustomQueryText = useCallback(
		(value: string) => {
			setBuilderState((current) => setDownloadSearchBuilderCustomQueryText(
				current,
				value,
			));
		},
		[ setBuilderState ],
	);

	return {
		replaceAudioCodec,
		replaceCategoryPreset,
		setCustomQueryText,
		setTitleLanguage,
		toggleAudioFlag,
	};
}
