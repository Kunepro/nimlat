import type { ImageGalleryTargetGuard } from "./image-gallery-draft-controller-types";
import { useImageGalleryTargetGuard } from "./useImageGalleryTargetGuard";

interface UseEditModalTargetGuardOptions<TTarget> {
	isActive: boolean;
	isSameTarget: (left: TTarget | null, right: TTarget) => boolean;
	target: TTarget | null;
}

// Metadata forms and image galleries share the same late-completion problem:
// a request may finish after the modal changed target. Keep the rule central.
export function useEditModalTargetGuard<TTarget>(
	options: UseEditModalTargetGuardOptions<TTarget>,
): ImageGalleryTargetGuard<TTarget> {
	return useImageGalleryTargetGuard(options);
}
