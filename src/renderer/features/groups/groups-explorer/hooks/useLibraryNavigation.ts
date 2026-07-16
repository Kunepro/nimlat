import type {
	LibraryDisplayItem,
	LibraryDisplayScope,
} from "@nimlat/types/ipc-payloads";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { ROUTES } from "../../../../constants/route-config";
import { createRouteHistoryState } from "../../../../types/router-history-state";

interface UseLibraryNavigationInput {
	scope: LibraryDisplayScope;
}

interface UseLibraryNavigationResult {
	onShellBack: () => void;
	handleOpenItem: (item: LibraryDisplayItem) => void;
	openAnimeDbDownload: () => void;
}

export function useLibraryNavigation({
																			 scope,
																		 }: UseLibraryNavigationInput): UseLibraryNavigationResult {
	const navigate       = useNavigate();
	const isIgnoredScope = scope === "ignored";

	const onShellBack = useCallback(
		() => {
			if (isIgnoredScope) {
				void navigate({ to: ROUTES.GROUPS.FULL_URL });
				return;
			}
			window.history.back();
		},
		[
			isIgnoredScope,
			navigate,
		],
	);

	const handleOpenItem = useCallback(
		(item: LibraryDisplayItem) => {
			if (item.kind === "group" && item.group) {
				void navigate({
					to:     ROUTES.GROUPS.GROUP.FULL_URL,
					params: {
						groupSource: item.group.source,
						groupId:     item.group.groupId.toString(),
					},
					state:  createRouteHistoryState({ groupName: item.name }),
				});
				return;
			}

			if (typeof item.mediaId !== "number") {
				return;
			}

			void navigate({
				to:     ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS_FULL_URL,
				params: { mediaId: item.mediaId.toString() },
				state:  createRouteHistoryState({
					mediaName: item.name,
					isFilm:    item.isFilm,
				}),
			});
		},
		[ navigate ],
	);

	const openAnimeDbDownload = useCallback(
		() => {
			void navigate({ to: ROUTES.DOWNLOAD_PRECACHED_ANIME_DB });
		},
		[ navigate ],
	);

	return {
		onShellBack,
		handleOpenItem,
		openAnimeDbDownload,
	};
}
