import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordPreset,
} from "@nimlat/types/download-search";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { createDownloadSearchQueryPresetLabel } from "../media-download-explorer.utils";

interface DownloadSearchPresetLabelDraftState {
	presetLabelDraft: string;
	setPresetLabelDraft: (value: string) => void;
}

export function useDownloadSearchPresetLabelDraft(
	selectedPresets: DownloadSearchKeywordPreset[],
	builderState: DownloadSearchBuilderState,
): DownloadSearchPresetLabelDraftState {
	const [ presetLabelDraft, setPresetLabelDraftValue ] = useState("");
	const [ isPresetLabelDirty, setPresetLabelDirty ]    = useState(false);
	const generatedPresetLabel                           = useMemo(
		() => createDownloadSearchQueryPresetLabel(
			selectedPresets,
			builderState.customQueryText,
		),
		[
			builderState.customQueryText,
			selectedPresets,
		],
	);

	useEffect(
		() => {
			if (!isPresetLabelDirty) {
				setPresetLabelDraftValue(generatedPresetLabel);
			}
		},
		[
			generatedPresetLabel,
			isPresetLabelDirty,
		],
	);

	const setPresetLabelDraft = useCallback(
		(value: string) => {
			// Preset labels stay generated until the user edits this field, then
			// the draft becomes an explicit user choice and stops following options.
			setPresetLabelDirty(true);
			setPresetLabelDraftValue(value);
		},
		[],
	);

	return {
		presetLabelDraft,
		setPresetLabelDraft,
	};
}
