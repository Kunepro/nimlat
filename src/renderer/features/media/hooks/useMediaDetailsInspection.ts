import { useParams } from "@tanstack/react-router";
import { resolveMediaDetailsGroupSource } from "../media-details-explorer-model";
import {
	type MediaDetailsInspection,
	type MediaDetailsInspectionRefreshController,
	type UpdateMediaDetailsInspection,
	useMediaDetailsInspectionRefresh,
} from "./useMediaDetailsInspectionRefresh";
import { useMediaDetailsInspectionSubscriptions } from "./useMediaDetailsInspectionSubscriptions";

export type {
	MediaDetailsInspection,
	UpdateMediaDetailsInspection,
};

interface UseMediaDetailsInspectionResult extends MediaDetailsInspectionRefreshController {
	numericMediaId: number;
}

// Owns the read side of the media-details route: route params, inspection loading,
// and BUS/preference invalidations that require a fresh compact detail payload.
export function useMediaDetailsInspection(): UseMediaDetailsInspectionResult {
	const {
					mediaId = "",
					groupSource,
				}                = useParams({ strict: false });
	const numericMediaId   = Number(mediaId);
	const mediaGroupSource = resolveMediaDetailsGroupSource(groupSource);
	const controller       = useMediaDetailsInspectionRefresh({
		mediaGroupSource,
		numericMediaId,
	});

	useMediaDetailsInspectionSubscriptions({
		numericMediaId,
		refreshMedia: controller.refreshMedia,
	});

	return {
		...controller,
		numericMediaId,
	};
}
