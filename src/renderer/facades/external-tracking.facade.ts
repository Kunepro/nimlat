import type { ElectronAPI } from "@nimlat/types/electron-api";
import { ExternalTrackingEventService } from "../services/external-tracking-event-service";

type ExternalTrackingApi = ElectronAPI["externalTracking"];
type ExternalTrackingEventsApi = typeof ExternalTrackingEventService;

export class ExternalTrackingFacade {
	public static getSettings(...args: Parameters<ExternalTrackingApi["getSettings"]>): ReturnType<ExternalTrackingApi["getSettings"]> {
		return window.electronAPI.externalTracking.getSettings(...args);
	}

	public static retrySecretStorage(...args: Parameters<ExternalTrackingApi["retrySecretStorage"]>): ReturnType<ExternalTrackingApi["retrySecretStorage"]> {
		return window.electronAPI.externalTracking.retrySecretStorage(...args);
	}

	public static startConnection(...args: Parameters<ExternalTrackingApi["startConnection"]>): ReturnType<ExternalTrackingApi["startConnection"]> {
		return window.electronAPI.externalTracking.startConnection(...args);
	}

	public static saveImplicitToken(...args: Parameters<ExternalTrackingApi["saveImplicitToken"]>): ReturnType<ExternalTrackingApi["saveImplicitToken"]> {
		return window.electronAPI.externalTracking.saveImplicitToken(...args);
	}

	public static connectKitsu(...args: Parameters<ExternalTrackingApi["connectKitsu"]>): ReturnType<ExternalTrackingApi["connectKitsu"]> {
		return window.electronAPI.externalTracking.connectKitsu(...args);
	}

	public static disconnect(...args: Parameters<ExternalTrackingApi["disconnect"]>): ReturnType<ExternalTrackingApi["disconnect"]> {
		return window.electronAPI.externalTracking.disconnect(...args);
	}

	public static importProvider(...args: Parameters<ExternalTrackingApi["importProvider"]>): ReturnType<ExternalTrackingApi["importProvider"]> {
		return window.electronAPI.externalTracking.importProvider(...args);
	}

	public static importKitsuPublic(...args: Parameters<ExternalTrackingApi["importKitsuPublic"]>): ReturnType<ExternalTrackingApi["importKitsuPublic"]> {
		return window.electronAPI.externalTracking.importKitsuPublic(...args);
	}

	public static importKitsuXml(...args: Parameters<ExternalTrackingApi["importKitsuXml"]>): ReturnType<ExternalTrackingApi["importKitsuXml"]> {
		return window.electronAPI.externalTracking.importKitsuXml(...args);
	}

	public static exportProvider(...args: Parameters<ExternalTrackingApi["exportProvider"]>): ReturnType<ExternalTrackingApi["exportProvider"]> {
		return window.electronAPI.externalTracking.exportProvider(...args);
	}

	public static accountsChanges(...args: Parameters<ExternalTrackingEventsApi["accountsChanges"]>): ReturnType<ExternalTrackingEventsApi["accountsChanges"]> {
		return ExternalTrackingEventService.accountsChanges(...args);
	}

	public static exportProgress(...args: Parameters<ExternalTrackingEventsApi["exportProgress"]>): ReturnType<ExternalTrackingEventsApi["exportProgress"]> {
		return ExternalTrackingEventService.exportProgress(...args);
	}
}
