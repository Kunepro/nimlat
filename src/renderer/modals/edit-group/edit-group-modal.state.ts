import {
	atom,
	useAtom,
	useSetAtom,
} from "jotai";
import { useCallback } from "react";
import type { EditGroupModalState } from "../../types/modals";

const defaultState: EditGroupModalState = {
	isOpen:             false,
	group:              {
		source: "official",
		groupId: 0,
	},
	initialName:        "",
	initialDescription: "",
};

const editGroupModalStateAtom = atom<EditGroupModalState>(defaultState);

export const useEditGroupModalState = () => useAtom(editGroupModalStateAtom);

export const useOpenEditGroupModal = () => {
	const setState = useSetAtom(editGroupModalStateAtom);

	return useCallback(
		(payload: Omit<EditGroupModalState, "isOpen">) => {
			setState({
				isOpen: true,
				...payload,
			});
		},
		[ setState ],
	);
};

export const useCloseEditGroupModal = () => {
	const setState = useSetAtom(editGroupModalStateAtom);

	return useCallback(
		() => {
			setState(defaultState);
		},
		[ setState ],
	);
};
