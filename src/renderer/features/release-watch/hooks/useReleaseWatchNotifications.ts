import { useCallback } from "react";
import { useAppMessage } from "../../../hooks";
import { formatReleaseWatchActionError } from "../release-watch-model";

export interface ReleaseWatchNotifications {
	notifyReleaseWatchError: (error: unknown, fallbackMessage: string) => void;
	notifyPastLoadError: (error: unknown) => void;
	notifyPastRefreshError: (error: unknown) => void;
	notifyUpcomingLoadError: (error: unknown) => void;
	notifyUpcomingRefreshError: (error: unknown) => void;
}

// Centralizes release-watch user notifications so feed hooks stay focused on
// loading semantics and the page controller does not carry message formatting.
export function useReleaseWatchNotifications(): ReleaseWatchNotifications {
	const messageApi                 = useAppMessage();
	const notifyReleaseWatchError    = useCallback(
		(
			error: unknown,
			fallbackMessage: string,
		) => {
			messageApi.error(formatReleaseWatchActionError(
				error,
				fallbackMessage,
			));
		},
		[ messageApi ],
	);
	const notifyPastLoadError        = useCallback(
		(error: unknown) => notifyReleaseWatchError(
			error,
			"Failed to load past releases.",
		),
		[ notifyReleaseWatchError ],
	);
	const notifyPastRefreshError     = useCallback(
		(error: unknown) => notifyReleaseWatchError(
			error,
			"Failed to refresh past releases.",
		),
		[ notifyReleaseWatchError ],
	);
	const notifyUpcomingLoadError    = useCallback(
		(error: unknown) => notifyReleaseWatchError(
			error,
			"Failed to load upcoming releases.",
		),
		[ notifyReleaseWatchError ],
	);
	const notifyUpcomingRefreshError = useCallback(
		(error: unknown) => notifyReleaseWatchError(
			error,
			"Failed to refresh upcoming releases.",
		),
		[ notifyReleaseWatchError ],
	);

	return {
		notifyReleaseWatchError,
		notifyPastLoadError,
		notifyPastRefreshError,
		notifyUpcomingLoadError,
		notifyUpcomingRefreshError,
	};
}
