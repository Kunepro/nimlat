import { useMediaEpisodesInspectionRefresh } from "./useMediaEpisodesInspectionRefresh";
import { useMediaEpisodesInspectionSubscriptions } from "./useMediaEpisodesInspectionSubscriptions";

export function useMediaEpisodesInspection(mediaIdNumber: number) {
	const controller = useMediaEpisodesInspectionRefresh(mediaIdNumber);

	useMediaEpisodesInspectionSubscriptions({
		mediaIdNumber,
		refreshMedia: controller.refreshMedia,
		setMedia:     controller.setMedia,
	});

	return controller;
}
