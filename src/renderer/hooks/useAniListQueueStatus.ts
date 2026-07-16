import type { AniListQueueStatus } from "@nimlat/types/ani-list-queue";
import {
	useEffect,
	useState,
} from "react";
import { AniListQueueFacade } from "../facades";

export function useAniListQueueStatus(): AniListQueueStatus {
	const [ queueStatus, setQueueStatus ] = useState<AniListQueueStatus>(() => AniListQueueFacade.getInitialStatus());

	useEffect(
		() => {
			const subscription = AniListQueueFacade.statusChanges().subscribe(setQueueStatus);
			return () => {
				subscription.unsubscribe();
			};
		},
		[],
	);

	return queueStatus;
}
