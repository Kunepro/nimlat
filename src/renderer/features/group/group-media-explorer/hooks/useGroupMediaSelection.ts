import type { GroupInspectionMediaCard } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useMemo,
	useState,
} from "react";

interface GroupMediaSelectionController {
	selectedMediaIds: Set<number>;
	selectedMedias: GroupInspectionMediaCard[];
	selectedMediaCount: number;
	clearMediaSelection: () => void;
	patchSelectedMedias: (patches: Array<Pick<GroupInspectionMediaCard, "mediaId"> & Partial<Omit<GroupInspectionMediaCard, "mediaId">>>) => void;
	removeSelectedMediasFromState: (medias: GroupInspectionMediaCard[]) => void;
	toggleMediaSelection: (media: GroupInspectionMediaCard, selected: boolean) => void;
}

export function useGroupMediaSelection(): GroupMediaSelectionController {
	const [ selectedMediaIds, setSelectedMediaIds ]     = useState<Set<number>>(() => new Set());
	const [ selectedMediasById, setSelectedMediasById ] = useState<Map<number, GroupInspectionMediaCard>>(() => new Map());

	const selectedMedias = useMemo(
		() => Array.from(selectedMediaIds)
			.map(mediaId => selectedMediasById.get(mediaId))
			.filter((media): media is GroupInspectionMediaCard => Boolean(media)),
		[
			selectedMediaIds,
			selectedMediasById,
		],
	);

	const toggleMediaSelection = useCallback(
		(media: GroupInspectionMediaCard, selected: boolean) => {
			setSelectedMediaIds((current) => {
				const next = new Set(current);
				if (selected) {
					next.add(media.mediaId);
				} else {
					next.delete(media.mediaId);
				}
				return next;
			});
			setSelectedMediasById((current) => {
				const next = new Map(current);
				if (selected) {
					next.set(
						media.mediaId,
						media,
					);
				} else {
					next.delete(media.mediaId);
				}
				return next;
			});
		},
		[],
	);

	const removeSelectedMediasFromState = useCallback(
		(medias: GroupInspectionMediaCard[]) => {
			const removedIds = new Set(medias.map(media => media.mediaId));
			setSelectedMediaIds(current => new Set(Array.from(current).filter(mediaId => !removedIds.has(mediaId))));
			setSelectedMediasById((current) => {
				const next = new Map(current);
				removedIds.forEach(mediaId => next.delete(mediaId));
				return next;
			});
		},
		[],
	);

	const patchSelectedMedias = useCallback(
		(patches: Array<Pick<GroupInspectionMediaCard, "mediaId"> & Partial<Omit<GroupInspectionMediaCard, "mediaId">>>) => {
			setSelectedMediasById((current) => {
				const next     = new Map(current);
				let hasChanges = false;
				patches.forEach((patch) => {
					const currentMedia = next.get(patch.mediaId);
					if (!currentMedia) {
						return;
					}
					next.set(
						patch.mediaId,
						{
							...currentMedia,
							...patch,
						},
					);
					hasChanges = true;
				});
				return hasChanges ? next : current;
			});
		},
		[],
	);

	const clearMediaSelection = useCallback(
		() => {
			setSelectedMediaIds(new Set());
			setSelectedMediasById(new Map());
		},
		[],
	);

	return {
		selectedMediaIds,
		selectedMedias,
		selectedMediaCount: selectedMediaIds.size,
		clearMediaSelection,
		patchSelectedMedias,
		removeSelectedMediasFromState,
		toggleMediaSelection,
	};
}
