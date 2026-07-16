import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordPreset,
} from "@nimlat/types/download-search";
import {
	DownloadSearchFacade,
	GroupExplorerFacade,
} from "../../../facades";
import { createDownloadSearchBuilderStateSaveRequest } from "./media-download-builder-state-model";
import { createDownloadSearchProviderOpenRequest } from "./media-download-provider-search-model";
import { createDownloadSearchQueryPresetRequest } from "./media-download-query-preset-model";

// Keeps media-download facade payloads outside React hooks. Hooks own lifecycle,
// optimistic UI, and error surfaces; this runner owns IPC command/read shapes.
export async function loadMediaDownloadInitialState(mediaId: number) {
	const [
					media,
					settings,
				] = await Promise.all([
		GroupExplorerFacade.getMediaInspection(mediaId),
		DownloadSearchFacade.getSettings(),
	]);

	return {
		media,
		settings,
	};
}

export function loadDownloadSearchSettings() {
	return DownloadSearchFacade.getSettings();
}

export function subscribeToDownloadSearchSettingsChanges(onChange: () => void) {
	return DownloadSearchFacade.settingsChanges().subscribe(onChange);
}

export function saveMediaDownloadBuilderState(
	mediaId: number,
	builderState: DownloadSearchBuilderState,
	lastUsedProviderId?: string,
) {
	return DownloadSearchFacade.saveBuilderState(createDownloadSearchBuilderStateSaveRequest(
		mediaId,
		builderState,
		lastUsedProviderId,
	));
}

export function openMediaDownloadProviderSearch(
	providerId: string,
	query: string,
	mediaId: number,
) {
	return DownloadSearchFacade.openProviderSearch(createDownloadSearchProviderOpenRequest(
		providerId,
		query,
		mediaId,
	));
}

export function createMediaDownloadQueryPreset(
	selectedPresets: DownloadSearchKeywordPreset[],
	builderState: DownloadSearchBuilderState,
	presetLabelDraft: string,
) {
	return DownloadSearchFacade.createQueryPreset(createDownloadSearchQueryPresetRequest(
		selectedPresets,
		builderState,
		presetLabelDraft,
	));
}

export function setMediaDownloadQueryPresetEnabled(presetId: string, enabled: boolean) {
	return DownloadSearchFacade.setQueryPresetEnabled(
		presetId,
		enabled,
	);
}

export function deleteMediaDownloadQueryPreset(presetId: string) {
	return DownloadSearchFacade.deleteQueryPreset(presetId);
}

export function markMediaDownloadStatusDownloading(mediaId: number) {
	return GroupExplorerFacade.setMediaIntegrationStatus({
		mediaId,
		integrationStatus: "downloading",
	});
}
