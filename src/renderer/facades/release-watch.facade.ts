import type { ElectronAPI } from "@nimlat/types/electron-api";
import { ReleaseWatchEventService } from "../services/release-watch-event-service";

type ReleaseWatchApi = ElectronAPI["releaseWatch"];
type ReleaseWatchEventsApi = typeof ReleaseWatchEventService;

export class ReleaseWatchFacade {
	public static listPast(...args: Parameters<ReleaseWatchApi["listPast"]>): ReturnType<ReleaseWatchApi["listPast"]> {
		return window.electronAPI.releaseWatch.listPast(...args);
	}

	public static listUpcoming(...args: Parameters<ReleaseWatchApi["listUpcoming"]>): ReturnType<ReleaseWatchApi["listUpcoming"]> {
		return window.electronAPI.releaseWatch.listUpcoming(...args);
	}

	public static pastListChanges(...args: Parameters<ReleaseWatchEventsApi["pastListChanges"]>): ReturnType<ReleaseWatchEventsApi["pastListChanges"]> {
		return ReleaseWatchEventService.pastListChanges(...args);
	}

	public static upcomingListChanges(...args: Parameters<ReleaseWatchEventsApi["upcomingListChanges"]>): ReturnType<ReleaseWatchEventsApi["upcomingListChanges"]> {
		return ReleaseWatchEventService.upcomingListChanges(...args);
	}
}
