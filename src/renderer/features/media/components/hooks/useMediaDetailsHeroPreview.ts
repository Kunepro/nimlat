import {
	useCallback,
	useMemo,
	useState,
} from "react";
import { resolveImageSrc } from "../../../../utils/resolve-image-src";
import {
	type MediaDetailsInspection,
	selectMediaHeroImageUrl,
} from "../media-details-hero-model";

interface MediaDetailsHeroPreviewController {
	closePreview: () => void;
	isPreviewOpen: boolean;
	openPreview: () => void;
	resolvedImageUrl?: string;
}

export function useMediaDetailsHeroPreview(media: MediaDetailsInspection): MediaDetailsHeroPreviewController {
	const [ isPreviewOpen, setPreviewOpen ] = useState(false);
	const imageUrl                          = selectMediaHeroImageUrl(media);
	const resolvedImageUrl                  = useMemo(
		() => imageUrl ? resolveImageSrc(imageUrl) : undefined,
		[ imageUrl ],
	);
	const openPreview                       = useCallback(
		() => setPreviewOpen(true),
		[],
	);
	const closePreview                      = useCallback(
		() => setPreviewOpen(false),
		[],
	);

	return {
		closePreview,
		isPreviewOpen,
		openPreview,
		resolvedImageUrl,
	};
}
