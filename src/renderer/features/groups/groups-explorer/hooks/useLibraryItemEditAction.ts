import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import { useCallback } from "react";
import { useOpenEditGroupModal } from "../../../../modals/edit-group/edit-group-modal.state";
import { useOpenEditMediaModal } from "../../../../modals/edit-media/edit-media-modal.state";

interface LibraryItemEditActionController {
	handleEditItem: (item: LibraryDisplayItem) => void;
}

export function useLibraryItemEditAction(): LibraryItemEditActionController {
	const openEditGroupModal = useOpenEditGroupModal();
	const openEditMediaModal = useOpenEditMediaModal();

	const handleEditItem = useCallback(
		(item: LibraryDisplayItem) => {
			if (item.kind === "group" && item.group) {
				openEditGroupModal({
					group:              item.group,
					initialName:        item.name,
					initialDescription: item.description || "",
				});
				return;
			}

			if (typeof item.mediaId !== "number") {
				return;
			}

			openEditMediaModal({
				mediaId:            item.mediaId,
				initialName:        item.name,
				initialDescription: item.description || "",
			});
		},
		[
			openEditGroupModal,
			openEditMediaModal,
		],
	);

	return { handleEditItem };
}
