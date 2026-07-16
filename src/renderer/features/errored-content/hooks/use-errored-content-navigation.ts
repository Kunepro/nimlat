import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { createErroredContentMediaNavigationTarget } from "../errored-content-state-model";

interface UseErroredContentNavigationResult {
	openMedia: (item: ErroredContentItem) => void;
}

// Keeps route construction out of page state. Errored-content rows navigate to
// standalone media details because failed hydrator queues are media-scoped.
export function useErroredContentNavigation(): UseErroredContentNavigationResult {
	const navigate = useNavigate();

	const openMedia = useCallback(
		(item: ErroredContentItem) => {
			void navigate(createErroredContentMediaNavigationTarget(item));
		},
		[ navigate ],
	);

	return { openMedia };
}
