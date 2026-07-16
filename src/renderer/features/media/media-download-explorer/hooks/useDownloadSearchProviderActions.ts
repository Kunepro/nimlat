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
import { useCallback } from "react";
import { formatMediaDownloadActionError } from "../media-download-action-model";
import {
	openMediaDownloadProviderSearch,
	saveMediaDownloadBuilderState,
} from "../media-download-explorer-runner";
import { createDownloadSearchProviderPresetSearchPlan } from "../media-download-provider-search-model";

interface DownloadSearchProviderActionsInput {
	builderState: DownloadSearchBuilderState;
	numericMediaId: number;
	presets: DownloadSearchKeywordPreset[];
	title: string;
	setActionError: Dispatch<SetStateAction<string | null>>;
}

interface DownloadSearchProviderActions {
	openProviderPresets: (provider: DownloadSearchProvider, targetPresets: DownloadSearchQueryPreset[]) => Promise<void>;
}

export function useDownloadSearchProviderActions({
																									 builderState,
																									 numericMediaId,
																									 presets,
																									 title,
																									 setActionError,
																								 }: DownloadSearchProviderActionsInput): DownloadSearchProviderActions {
	const openProviderPresets = useCallback(
		async (
			provider: DownloadSearchProvider,
			targetPresets: DownloadSearchQueryPreset[],
		) => {
			const plan = createDownloadSearchProviderPresetSearchPlan(
				title,
				presets,
				targetPresets,
			);
			if (plan.errorMessage) {
				setActionError(plan.errorMessage);
				return;
			}

			try {
				setActionError(null);
				await saveMediaDownloadBuilderState(
					numericMediaId,
					builderState,
					provider.id,
				);

				for (const query of plan.queries) {
					const result = await openMediaDownloadProviderSearch(
						provider.id,
						query,
						numericMediaId,
					);
					if (!result.success) {
						setActionError(result.error ?? "Failed to open provider search.");
						return;
					}
				}
			} catch (error) {
				setActionError(formatMediaDownloadActionError(
					error,
					"Failed to open provider search.",
				));
			}
		},
		[
			builderState,
			numericMediaId,
			presets,
			setActionError,
			title,
		],
	);

	return { openProviderPresets };
}
