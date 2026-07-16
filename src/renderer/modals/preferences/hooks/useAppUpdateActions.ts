import type { AppUpdateStatus } from "@nimlat/types/app-update";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import {
	useCallback,
	useRef,
	useState,
} from "react";
import { useIsMountedRef } from "../../../hooks";
import {
	createLocalErrorStatus,
	formatUnknownError,
} from "../app-update-preferences-model";
import {
	checkForAppUpdates,
	runAppUpdateForStatus,
} from "../app-update-preferences-runner";

interface UseAppUpdateActionsInput {
	status: AppUpdateStatus | null;
	setStatus: Dispatch<SetStateAction<AppUpdateStatus | null>>;
}

interface UseAppUpdateActionsResult {
	isActionRunning: boolean;
	checkForUpdates: () => void;
	updateApp: () => void;
}

type AppUpdateAction = () => Promise<AppUpdateStatus> | Promise<void>;

export function useAppUpdateActions({
																			status,
																			setStatus,
																		}: UseAppUpdateActionsInput): UseAppUpdateActionsResult {
	const [ isActionRunning, setActionRunning ] = useState(false);
	const isMountedRef                          = useIsMountedRef();
	const latestActionTokenRef                  = useRef(0);

	const runAction = useCallback(
		(action: AppUpdateAction) => {
			const actionToken            = latestActionTokenRef.current + 1;
			latestActionTokenRef.current = actionToken;
			const canApplyActionResult   = (): boolean => (
				isMountedRef.current
				&& latestActionTokenRef.current === actionToken
			);

			// Only the latest user-triggered action may publish state. This prevents
			// a slow earlier action from clearing loading or overwriting a newer result.
			setActionRunning(true);
			action()
				.then((nextStatus) => {
					if (canApplyActionResult() && nextStatus) {
						setStatus(nextStatus);
					}
				})
				.catch((error: unknown) => {
					if (canApplyActionResult()) {
						setStatus(createLocalErrorStatus(formatUnknownError(
							error,
							"Update action failed.",
						)));
					}
				})
				.finally(() => {
					if (canApplyActionResult()) {
						setActionRunning(false);
					}
				});
		},
		[
			isMountedRef,
			setStatus,
		],
	);

	const checkForUpdates = useCallback(
		() => {
			runAction(checkForAppUpdates);
		},
		[ runAction ],
	);

	const updateApp = useCallback(
		() => {
			runAction(() => runAppUpdateForStatus(status));
		},
		[
			runAction,
			status,
		],
	);

	return {
		isActionRunning,
		checkForUpdates,
		updateApp,
	};
}
