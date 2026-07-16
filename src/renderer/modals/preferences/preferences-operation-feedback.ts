import { useCallback } from "react";
import { useAppMessage } from "../../hooks";

export function formatPreferenceOperationError(
	error: unknown,
	fallbackMessage: string,
): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallbackMessage;
}

export function usePreferenceOperationFeedback(): {
	showPreferenceOperationError: (error: unknown, fallbackMessage: string) => void;
} {
	const messageApi                   = useAppMessage();
	const showPreferenceOperationError = useCallback(
		(
			error: unknown,
			fallbackMessage: string,
		): void => {
			messageApi.error(formatPreferenceOperationError(
				error,
				fallbackMessage,
			));
		},
		[ messageApi ],
	);

	return { showPreferenceOperationError };
}
