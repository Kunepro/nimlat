import {
	atom,
	useAtom,
	useSetAtom,
} from "jotai";
import { useCallback } from "react";
import type { EditEpisodeModalState } from "../../types/modals";

const defaultState: EditEpisodeModalState = {
	isOpen:             false,
	mediaId:            null,
	episodeNumber:      null,
	initialName:        "",
	initialDescription: "",
};

const editEpisodeModalStateAtom = atom<EditEpisodeModalState>(defaultState);

export const useEditEpisodeModalState = () => useAtom(editEpisodeModalStateAtom);

export const useOpenEditEpisodeModal = () => {
	const setState = useSetAtom(editEpisodeModalStateAtom);

	return useCallback(
		(payload: Omit<EditEpisodeModalState, "isOpen">) => {
			setState({
				isOpen: true,
				...payload,
			});
		},
		[ setState ],
	);
};

export const useCloseEditEpisodeModal = () => {
	const setState = useSetAtom(editEpisodeModalStateAtom);

	return useCallback(
		() => {
			setState(defaultState);
		},
		[ setState ],
	);
};
