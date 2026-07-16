import type { AppUpdateStatus } from "@nimlat/types/app-update";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import {
	useEffect,
	useState,
} from "react";
import {
	createLocalErrorStatus,
	formatUnknownError,
} from "../app-update-preferences-model";
import {
	loadAppUpdateStatus,
	subscribeToAppUpdateStatusChanges,
} from "../app-update-preferences-runner";

interface UseAppUpdateStatusResult {
	status: AppUpdateStatus | null;
	setStatus: Dispatch<SetStateAction<AppUpdateStatus | null>>;
}

export function useAppUpdateStatus(): UseAppUpdateStatusResult {
	const [ status, setStatus ] = useState<AppUpdateStatus | null>(null);

	useEffect(
		() => {
			let isActive               = true;
			let hasReceivedStatusEvent = false;
			const applyStatus          = (nextStatus: AppUpdateStatus): void => {
				if (isActive) {
					setStatus(nextStatus);
				}
			};

			// The push event stream is fresher than the initial request. If it wins
			// the race, the late initial response must not roll the UI back.
			const statusSubscription = subscribeToAppUpdateStatusChanges((nextStatus) => {
				hasReceivedStatusEvent = true;
				applyStatus(nextStatus);
			});

			loadAppUpdateStatus()
				.then((nextStatus) => {
					if (!hasReceivedStatusEvent) {
						applyStatus(nextStatus);
					}
				})
				.catch((error: unknown) => {
					if (!hasReceivedStatusEvent) {
						applyStatus(createLocalErrorStatus(formatUnknownError(
							error,
							"Failed to load update status.",
						)));
					}
				});

			return () => {
				isActive = false;
				statusSubscription.unsubscribe();
			};
		},
		[],
	);

	return {
		status,
		setStatus,
	};
}
