import { networkStatusService } from "./network-status-service";

export function initializeNetworkStatusService(): void {
	networkStatusService.start();
}
