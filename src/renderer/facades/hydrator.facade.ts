import type { ElectronAPI } from "@nimlat/types/electron-api";
import { HydratorEventService } from "../services/hydrator-event-service";

type HydratorApi = ElectronAPI["hydrator"];
type HydratorEventsApi = typeof HydratorEventService;

export class HydratorFacade {
	public static listErroredContent(...args: Parameters<HydratorApi["listErroredContent"]>): ReturnType<HydratorApi["listErroredContent"]> {
		return window.electronAPI.hydrator.listErroredContent(...args);
	}

	public static retryErroredContent(...args: Parameters<HydratorApi["retryErroredContent"]>): ReturnType<HydratorApi["retryErroredContent"]> {
		return window.electronAPI.hydrator.retryErroredContent(...args);
	}

	public static retryAllErroredContent(...args: Parameters<HydratorApi["retryAllErroredContent"]>): ReturnType<HydratorApi["retryAllErroredContent"]> {
		return window.electronAPI.hydrator.retryAllErroredContent(...args);
	}

	public static hideErroredContent(...args: Parameters<HydratorApi["hideErroredContent"]>): ReturnType<HydratorApi["hideErroredContent"]> {
		return window.electronAPI.hydrator.hideErroredContent(...args);
	}

	public static reportErroredContent(...args: Parameters<HydratorApi["reportErroredContent"]>): ReturnType<HydratorApi["reportErroredContent"]> {
		return window.electronAPI.hydrator.reportErroredContent(...args);
	}

	public static getProgressSnapshot(...args: Parameters<HydratorApi["getProgressSnapshot"]>): ReturnType<HydratorApi["getProgressSnapshot"]> {
		return window.electronAPI.hydrator.getProgressSnapshot(...args);
	}

	public static queueChanges(...args: Parameters<HydratorEventsApi["queueChanges"]>): ReturnType<HydratorEventsApi["queueChanges"]> {
		return HydratorEventService.queueChanges(...args);
	}

	public static progressChanges(...args: Parameters<HydratorEventsApi["progressChanges"]>): ReturnType<HydratorEventsApi["progressChanges"]> {
		return HydratorEventService.progressChanges(...args);
	}
}
