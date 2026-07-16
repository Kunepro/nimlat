import type { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";
import { useNavigate } from "@tanstack/react-router";
import {
	useCallback,
	useEffect,
} from "react";
import { ROUTES } from "../../../constants/route-config";

// Download completion controls first-run routing. Keeping route effects here
// avoids mixing navigation side effects into progress and action hooks.
export function useAnimeDbDownloadNavigation(status: AnimeDbDownloadProgressData["status"]) {
	const navigate = useNavigate();

	useEffect(
		() => {
			if (status === "completed") {
				void navigate({ to: ROUTES.GROUPS.FULL_URL });
			}
		},
		[
			navigate,
			status,
		],
	);

	const goToApp            = useCallback(
		() => void navigate({ to: ROUTES.GROUPS.FULL_URL }),
		[ navigate ],
	);
	const goToAniListBuilder = useCallback(
		() => void navigate({ to: ROUTES.POPULATE_ANIME_DB }),
		[ navigate ],
	);

	return {
		goToApp,
		goToAniListBuilder,
	};
}
