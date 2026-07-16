import { AniListQueueStatusService } from "../services/ani-list-queue-status-service";

type AniListQueueStatusApi = typeof AniListQueueStatusService;

export class AniListQueueFacade {
	public static statusChanges(...args: Parameters<AniListQueueStatusApi["statusChanges"]>): ReturnType<AniListQueueStatusApi["statusChanges"]> {
		return AniListQueueStatusService.statusChanges(...args);
	}

	public static getInitialStatus(...args: Parameters<AniListQueueStatusApi["getInitialStatus"]>): ReturnType<AniListQueueStatusApi["getInitialStatus"]> {
		return AniListQueueStatusService.getInitialStatus(...args);
	}
}
