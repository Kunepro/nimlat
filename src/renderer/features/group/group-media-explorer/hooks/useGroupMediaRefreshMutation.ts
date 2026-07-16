import { useCallback } from "react";
import { refreshGroupMediaItem } from "../group-media-mutations-runner";

interface GroupMediaRefreshMutationOptions {
	requestWallReload: (showInitialLoader?: boolean) => void;
}

interface GroupMediaRefreshMutationController {
	refreshMedia: (mediaId: number) => Promise<void>;
}

export function useGroupMediaRefreshMutation({
																							 requestWallReload,
																						 }: GroupMediaRefreshMutationOptions): GroupMediaRefreshMutationController {
	const refreshMedia = useCallback(
		async (mediaId: number) => {
			await refreshGroupMediaItem(mediaId);
			requestWallReload();
		},
		[ requestWallReload ],
	);

	return { refreshMedia };
}
