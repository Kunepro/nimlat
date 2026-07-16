import type { LibrarySelectionInput } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useState,
} from "react";
import {
	useAppMessage,
	useIsMountedRef,
} from "../../../../hooks";
import {
	assertAddToGroupMutationSucceeded,
	formatAddToGroupModalError,
} from "../add-to-group-modal-model";
import {
	persistAddToExistingGroup,
	persistAddToNewGroup,
} from "../library-item-actions-runner";

interface UseAddToGroupActionsInput {
	createName: string;
	hasMergeableSelectedGroups: boolean;
	hasSelectedGroup: boolean;
	onClose: () => void;
	onCompleted: () => void;
	selectionInputs: LibrarySelectionInput[];
}

interface UseAddToGroupActionsResult {
	assignToGroup: (groupId: number, isPreferredTarget: boolean) => void;
	createGroup: () => void;
	isSubmitting: boolean;
}

// Write-side modal actions. The hook owns only transient UI state; grouping rules
// remain behind the facade/main-process services.
export function useAddToGroupActions({
																			 createName,
																			 hasMergeableSelectedGroups,
																			 hasSelectedGroup,
																			 onClose,
																			 onCompleted,
																			 selectionInputs,
																		 }: UseAddToGroupActionsInput): UseAddToGroupActionsResult {
	const messageApi                        = useAppMessage();
	const [ isSubmitting, setIsSubmitting ] = useState(false);
	const isMountedRef                      = useIsMountedRef();

	const finishSuccessfulMutation = useCallback(
		() => {
			onCompleted();
			onClose();
		},
		[
			onClose,
			onCompleted,
		],
	);

	const assignToGroup = useCallback(
		(groupId: number, isPreferredTarget: boolean) => {
			void (async () => {
				setIsSubmitting(true);
				try {
					// Add To absorbs the old merge action: choosing one of several selected groups keeps it
					// as the target and folds the other selected groups into it.
					const result = await persistAddToExistingGroup({
						groupId,
						hasMergeableSelectedGroups,
						isPreferredTarget,
						selectionInputs,
					});
					assertAddToGroupMutationSucceeded(result);
					if (isMountedRef.current) {
						finishSuccessfulMutation();
					}
				} catch (error) {
					if (isMountedRef.current) {
						messageApi.error(`Failed to add selection to group: ${ formatAddToGroupModalError(error) }`);
					}
				} finally {
					if (isMountedRef.current) {
						setIsSubmitting(false);
					}
				}
			})();
		},
		[
			finishSuccessfulMutation,
			hasMergeableSelectedGroups,
			isMountedRef,
			messageApi,
			selectionInputs,
		],
	);

	const createGroup = useCallback(
		() => {
			void (async () => {
				setIsSubmitting(true);
				try {
					// Any selected group means the new group replaces selected containers,
					// keeping the unified Add To flow for one or many source groups.
					const result = await persistAddToNewGroup({
						createName,
						hasSelectedGroup,
						selectionInputs,
					});
					assertAddToGroupMutationSucceeded(result);
					if (isMountedRef.current) {
						finishSuccessfulMutation();
					}
				} catch (error) {
					if (isMountedRef.current) {
						messageApi.error(`Failed to create group: ${ formatAddToGroupModalError(error) }`);
					}
				} finally {
					if (isMountedRef.current) {
						setIsSubmitting(false);
					}
				}
			})();
		},
		[
			createName,
			finishSuccessfulMutation,
			hasSelectedGroup,
			isMountedRef,
			messageApi,
			selectionInputs,
		],
	);

	return {
		assignToGroup,
		createGroup,
		isSubmitting,
	};
}
