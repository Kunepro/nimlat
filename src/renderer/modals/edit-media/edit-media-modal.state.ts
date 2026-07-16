import {
	atom,
	useAtom,
	useSetAtom,
} from "jotai";
import { useCallback } from "react";
import type { EditMediaModalState } from "../../types/modals";

const defaultState: EditMediaModalState = {
	isOpen:             false,
	mediaId:            null,
	initialName:        "",
	initialDescription: "",
};

const editMediaModalStateAtom = atom<EditMediaModalState>(defaultState);

export const useEditMediaModalState = () => useAtom(editMediaModalStateAtom);

export const useOpenEditMediaModal = () => {
	const setState = useSetAtom(editMediaModalStateAtom);

	return useCallback(
		(payload: Omit<EditMediaModalState, "isOpen">) => {
			setState({
				isOpen: true,
				...payload,
			});
		},
		[ setState ],
	);
};

export const useCloseEditMediaModal = () => {
	const setState = useSetAtom(editMediaModalStateAtom);

	return useCallback(
		() => {
			setState(defaultState);
		},
		[ setState ],
	);
};
