import type { ElectronAPI } from "@nimlat/types/electron-api";
import { networkStatusService } from "../services/network-status-service";

type NetworkApi = ElectronAPI["network"];
type NetworkStatusApi = typeof networkStatusService;

export class NetworkFacade {
	public static sendConnectivityStatus(...args: Parameters<NetworkApi["sendConnectivityStatus"]>): ReturnType<NetworkApi["sendConnectivityStatus"]> {
		return window.electronAPI.network.sendConnectivityStatus(...args);
	}

	public static statusChanges(...args: Parameters<NetworkStatusApi["statusChanges"]>): ReturnType<NetworkStatusApi["statusChanges"]> {
		return networkStatusService.statusChanges(...args);
	}

	public static getSnapshot(...args: Parameters<NetworkStatusApi["getSnapshot"]>): ReturnType<NetworkStatusApi["getSnapshot"]> {
		return networkStatusService.getSnapshot(...args);
	}
}
