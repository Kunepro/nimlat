import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { ROUTES } from "../../../constants/route-config";
import { useGroupsShellHeader } from "./use-groups-shell-header";

interface UseGroupsShellHistoryBackHeaderOptions {
	title: string;
}

// Detail pages are often opened from a specific tab/card state. Browser history
// is the safest way back to that exact origin, with the library as a deterministic
// fallback when the page is opened directly.
export function useGroupsShellHistoryBackHeader({
																									title,
																								}: UseGroupsShellHistoryBackHeaderOptions): void {
	const navigate = useNavigate();
	const onBack   = useCallback(
		() => {
			if (window.history.length > 1) {
				window.history.back();
				return;
			}

			void navigate({ to: ROUTES.GROUPS.FULL_URL });
		},
		[ navigate ],
	);

	useGroupsShellHeader({
		title,
		onBack,
	});
}
