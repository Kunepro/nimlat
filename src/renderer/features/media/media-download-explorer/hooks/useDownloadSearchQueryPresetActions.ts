import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordPreset,
	DownloadSearchQueryPreset,
} from "@nimlat/types/download-search";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import { useCallback } from "react";
import { formatMediaDownloadActionError } from "../media-download-action-model";
import {
	createMediaDownloadQueryPreset,
	deleteMediaDownloadQueryPreset,
	setMediaDownloadQueryPresetEnabled,
} from "../media-download-explorer-runner";
import {
	removeDownloadSearchQueryPreset,
	rollbackDownloadSearchQueryPresetEnabled,
	setDownloadSearchQueryPresetEnabled,
} from "../media-download-query-preset-model";

interface DownloadSearchQueryPresetActionsInput {
	builderState: DownloadSearchBuilderState;
	presetLabelDraft: string;
	selectedPresets: DownloadSearchKeywordPreset[];
	setActionError: Dispatch<SetStateAction<string | null>>;
	setQueryPresets: Dispatch<SetStateAction<DownloadSearchQueryPreset[]>>;
}

interface DownloadSearchQueryPresetActions {
	createQueryPreset: () => Promise<void>;
	deleteQueryPreset: (presetId: string) => Promise<void>;
	toggleQueryPreset: (presetId: string, enabled: boolean) => void;
}

export function useDownloadSearchQueryPresetActions({
																											builderState,
																											presetLabelDraft,
																											selectedPresets,
																											setActionError,
																											setQueryPresets,
																										}: DownloadSearchQueryPresetActionsInput): DownloadSearchQueryPresetActions {
	const createQueryPreset = useCallback(
		async () => {
			try {
				setActionError(null);
				const preset = await createMediaDownloadQueryPreset(
					selectedPresets,
					builderState,
					presetLabelDraft,
				);
				setQueryPresets((current) => [
					...current,
					preset,
				]);
			} catch (error) {
				setActionError(formatMediaDownloadActionError(
					error,
					"Failed to create download search preset.",
				));
			}
		},
		[
			builderState,
			presetLabelDraft,
			selectedPresets,
			setActionError,
			setQueryPresets,
		],
	);

	const toggleQueryPreset = useCallback(
		(presetId: string, enabled: boolean) => {
			setActionError(null);
			setQueryPresets((current) => setDownloadSearchQueryPresetEnabled(
				current,
				presetId,
				enabled,
			));
			setMediaDownloadQueryPresetEnabled(
				presetId,
				enabled,
			).catch((error: unknown) => {
				setQueryPresets((current) => rollbackDownloadSearchQueryPresetEnabled(
					current,
					presetId,
					enabled,
				));
				setActionError(formatMediaDownloadActionError(
					error,
					"Failed to update download search preset.",
				));
			});
		},
		[
			setActionError,
			setQueryPresets,
		],
	);

	const deleteQueryPreset = useCallback(
		async (presetId: string) => {
			try {
				await deleteMediaDownloadQueryPreset(presetId);
				setQueryPresets((current) => removeDownloadSearchQueryPreset(
					current,
					presetId,
				));
			} catch (error) {
				setActionError(formatMediaDownloadActionError(
					error,
					"Failed to delete download search preset.",
				));
			}
		},
		[
			setActionError,
			setQueryPresets,
		],
	);

	return {
		createQueryPreset,
		deleteQueryPreset,
		toggleQueryPreset,
	};
}
