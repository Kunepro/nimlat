import type { GroupInspectionMediaCard } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { ROUTES } from "../../../../constants/route-config";
import { createRouteHistoryState } from "../../../../types/router-history-state";

export function useGroupMediaGridNavigation(
	group: GroupRef,
	groupName: string,
): (media: GroupInspectionMediaCard) => void {
	const navigate = useNavigate();

	return useCallback(
		(media: GroupInspectionMediaCard) => {
			void navigate({
				to:     ROUTES.GROUPS.MEDIA.DETAILS_FULL_URL,
				params: {
					groupSource: group.source,
					groupId:     group.groupId.toString(),
					mediaId:     media.mediaId.toString(),
				},
				state:  createRouteHistoryState({
					groupName,
					mediaName: media.name,
					isFilm:    media.isFilm,
				}),
			});
		},
		[
			group.groupId,
			group.source,
			groupName,
			navigate,
		],
	);
}
