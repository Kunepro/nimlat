import type { AppUpdateStatus } from "./app-update";
import type {
	RendererImageFetchRequest,
	RendererImageFetchResponse,
	RendererLocalImageFetchRequest,
} from "./ipc-renderer-image-payloads";
import type { ToasterMessageEvent } from "./toaster";

export type OpenExternalUrlResult = {
	success: true;
} | {
	success: false;
	error: string;
};

export interface AniListQueueElectronApi {
	onPaused(callback: (seconds: number) => void): () => void;
}

export interface RendererImagesElectronApi {
	fetchRemoteImage(request: RendererImageFetchRequest): Promise<RendererImageFetchResponse>;

	fetchLocalImage(request: RendererLocalImageFetchRequest): Promise<RendererImageFetchResponse>;
}

export interface NetworkElectronApi {
	sendConnectivityStatus(isOnline: boolean): void;
}

export interface ExternalNavigationElectronApi {
	openExternalUrl(url: string): Promise<OpenExternalUrlResult>;
}

export interface AppUpdateElectronApi {
	isIntegratedUpdaterVisible: () => boolean;

	getStatus(): Promise<AppUpdateStatus>;

	checkForUpdates(): Promise<AppUpdateStatus>;

	downloadUpdate(): Promise<AppUpdateStatus>;

	installDownloadedUpdate(): Promise<void>;

	onStatusChanged(callback: (status: AppUpdateStatus) => void): () => void;
}

export interface ToasterElectronApi {
	onToasterMessage(callback: (event: ToasterMessageEvent) => void): () => void;
}
