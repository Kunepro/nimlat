import type {
	GroupExplorerCard,
	LibraryDisplayItem,
} from "@nimlat/types/ipc-payloads";
import {
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	excludeSelectedGroups,
	getAddToGroupSummaryText,
	toSelectedGroupCards,
	toSelectionInputs,
} from "../add-to-group-modal-model";
import { useAddToGroupActions } from "./useAddToGroupActions";
import { useAddToGroupGroupsFeed } from "./useAddToGroupGroupsFeed";

interface UseAddToGroupModalControllerInput {
	isOpen: boolean;
	selectedItems: LibraryDisplayItem[];
	onClose: () => void;
	onCompleted: () => void;
}

interface UseAddToGroupModalControllerResult {
	createName: string;
	hasMergeableSelectedGroups: boolean;
	isLoadingGroups: boolean;
	isSubmitting: boolean;
	otherGroups: GroupExplorerCard[];
	preferredGroups: GroupExplorerCard[];
	summaryText: string;
	assignToGroup: (groupId: number, isPreferredTarget: boolean) => void;
	createGroup: () => void;
	setCreateName: (name: string) => void;
}

export function useAddToGroupModalController({
																							 isOpen,
																							 selectedItems,
																							 onClose,
																							 onCompleted,
																						 }: UseAddToGroupModalControllerInput): UseAddToGroupModalControllerResult {
	const [ createName, setCreateName ] = useState("");
	const {
					groups,
					isLoadingGroups,
				}                             = useAddToGroupGroupsFeed({ isOpen });
	const selectionInputs               = useMemo(
		() => toSelectionInputs(selectedItems),
		[ selectedItems ],
	);
	const preferredGroups               = useMemo(
		() => toSelectedGroupCards(selectedItems),
		[ selectedItems ],
	);
	const otherGroups                   = useMemo(
		() => excludeSelectedGroups(
			groups,
			preferredGroups,
		),
		[
			groups,
			preferredGroups,
		],
	);
	const hasSelectedGroup              = preferredGroups.length >= 1;
	const hasMergeableSelectedGroups    = preferredGroups.length >= 2;
	const summaryText                   = useMemo(
		() => getAddToGroupSummaryText(selectedItems.length),
		[ selectedItems.length ],
	);

	useEffect(
		() => {
			if (!isOpen) {
				setCreateName("");
			}
		},
		[ isOpen ],
	);

	const {
					assignToGroup,
					createGroup,
					isSubmitting,
				} = useAddToGroupActions({
		createName,
		hasMergeableSelectedGroups,
		hasSelectedGroup,
		onClose,
		onCompleted,
		selectionInputs,
	});

	return {
		assignToGroup,
		createGroup,
		createName,
		hasMergeableSelectedGroups,
		isLoadingGroups,
		isSubmitting,
		otherGroups,
		preferredGroups,
		setCreateName,
		summaryText,
	};
}
