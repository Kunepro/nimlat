import type {
	ExternalTrackingExportProgressEvent,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import {
	ExternalNavigationFacade,
	ExternalTrackingFacade,
} from "../../facades";
import {
	createAniListImplicitAuthorizationUrl,
	createAniListImplicitTokenRequest,
	createExternalTrackingStartConnectionRequest,
	createKitsuPasswordConnectionRequest,
	createKitsuPublicProfileImportRequest,
	type ExternalTrackingProviderDrafts,
} from "./external-tracking-preferences-model";

// Owns the external-tracking Preferences command/read surface. Payload builders
// stay pure in the model; hooks only decide when to run commands and how to show results.
export function loadExternalTrackingSettings() {
	return ExternalTrackingFacade.getSettings();
}

export function retryExternalTrackingSecretStorage() {
	return ExternalTrackingFacade.retrySecretStorage();
}

export function subscribeToExternalTrackingAccountsChanges(onChange: () => void) {
	return ExternalTrackingFacade.accountsChanges().subscribe(onChange);
}

export function subscribeToExternalTrackingExportProgress(onProgress: (event: ExternalTrackingExportProgressEvent) => void) {
	return ExternalTrackingFacade.exportProgress().subscribe(onProgress);
}

export function startExternalTrackingConnection(
	provider: ExternalTrackingProvider,
	drafts: ExternalTrackingProviderDrafts,
) {
	return ExternalTrackingFacade.startConnection(createExternalTrackingStartConnectionRequest(
		provider,
		drafts,
	));
}

export function saveAniListExternalTrackingToken(drafts: ExternalTrackingProviderDrafts) {
	return ExternalTrackingFacade.saveImplicitToken(createAniListImplicitTokenRequest(drafts));
}

export async function requestAniListExternalTrackingAccessToken(drafts: ExternalTrackingProviderDrafts): Promise<void> {
	const result = await ExternalNavigationFacade.openExternalUrl(
		createAniListImplicitAuthorizationUrl(drafts.anilist.clientId),
	);
	if (!result.success) {
		throw new Error(result.error);
	}
}

export function connectKitsuExternalTracking(drafts: ExternalTrackingProviderDrafts) {
	return ExternalTrackingFacade.connectKitsu(createKitsuPasswordConnectionRequest(drafts));
}

export function importKitsuPublicExternalTracking(drafts: ExternalTrackingProviderDrafts) {
	return ExternalTrackingFacade.importKitsuPublic(createKitsuPublicProfileImportRequest(drafts));
}

export function importKitsuXmlExternalTracking() {
	return ExternalTrackingFacade.importKitsuXml();
}

export function importExternalTrackingProvider(provider: ExternalTrackingProvider) {
	return ExternalTrackingFacade.importProvider(provider);
}

export function exportExternalTrackingProvider(provider: ExternalTrackingProvider) {
	return ExternalTrackingFacade.exportProvider(provider);
}

export function disconnectExternalTrackingProvider(provider: ExternalTrackingProvider) {
	return ExternalTrackingFacade.disconnect(provider);
}
