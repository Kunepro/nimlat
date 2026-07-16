import {
	useCallback,
	useState,
} from "react";

interface UseAddToGroupModalStateInput {
	clearSelection: () => void;
	requestWallReload: () => void;
}

interface UseAddToGroupModalStateResult {
	closeAddToModal: () => void;
	handleAddToCompleted: () => void;
	handleOpenAddToModal: () => void;
	isAddToModalOpen: boolean;
}

// The Add To modal mutates grouping state; successful completion always clears
// the stale selection and refreshes the wall from the DB-backed read model.
export function useAddToGroupModalState({
																					clearSelection,
																					requestWallReload,
																				}: UseAddToGroupModalStateInput): UseAddToGroupModalStateResult {
	const [ isAddToModalOpen, setAddToModalOpen ] = useState(false);

	const handleOpenAddToModal = useCallback(
		() => setAddToModalOpen(true),
		[],
	);

	const closeAddToModal = useCallback(
		() => setAddToModalOpen(false),
		[],
	);

	const handleAddToCompleted = useCallback(
		() => {
			clearSelection();
			requestWallReload();
		},
		[
			clearSelection,
			requestWallReload,
		],
	);

	return {
		closeAddToModal,
		handleAddToCompleted,
		handleOpenAddToModal,
		isAddToModalOpen,
	};
}
