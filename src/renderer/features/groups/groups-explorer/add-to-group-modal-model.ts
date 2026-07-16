import type {
	GroupExplorerCard,
	LibraryDisplayItem,
	LibrarySelectionInput,
} from "@nimlat/types/ipc-payloads";

type AddToGroupMutationResult =
	| { success: true }
	| { success: false; error: string };

export function toSelectionInputs(items: LibraryDisplayItem[]): LibrarySelectionInput[] {
	return items.reduce<LibrarySelectionInput[]>(
		(selectionInputs, item) => {
			if (item.kind === "group" && item.group) {
				selectionInputs.push({
					kind:  "group",
					group: item.group,
				});
				return selectionInputs;
			}

			if (typeof item.mediaId === "number") {
				selectionInputs.push({
					kind:    "media",
					mediaId: item.mediaId,
				});
			}

			return selectionInputs;
		},
		[],
	);
}

// Selected groups are shown first because selecting one of them turns "Add To" into
// a replacement/merge flow: the chosen group survives and the other selected containers fold into it.
export function toSelectedGroupCards(items: LibraryDisplayItem[]): GroupExplorerCard[] {
	return items.flatMap((item) => {
		if (item.kind !== "group" || !item.group) {
			return [];
		}

		return [
			{
				id:                 item.group.groupId,
				name:               item.name,
				description:        item.description,
				imageUrl:           item.displayImageUrl || item.imageUrl,
				baseMediaId:        undefined,
				integrationPercent: item.integrationPercent,
				integrationStatus:  item.integrationStatus,
				lastRefresh:        item.lastRefresh,
			},
		];
	});
}

export function getAddToGroupSummaryText(selectedItemCount: number): string {
	return `${ selectedItemCount } selected item${ selectedItemCount === 1 ? "" : "s" }`;
}

export function excludeSelectedGroups(
	groups: GroupExplorerCard[],
	preferredGroups: GroupExplorerCard[],
): GroupExplorerCard[] {
	const selectedGroupIds = new Set(preferredGroups.map((group) => group.id));

	return groups.filter((group) => !selectedGroupIds.has(group.id));
}

export function assertAddToGroupMutationSucceeded(result: AddToGroupMutationResult): void {
	if (!result.success) {
		throw new Error(result.error);
	}
}

export function formatAddToGroupModalError(error: unknown): string {
	return error instanceof Error ? error.message : "unknown error";
}
