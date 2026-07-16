import {
	useCallback,
	useRef,
} from "react";
import { useIsMountedRef } from "../../../hooks";
import type { ImageGalleryTargetGuard } from "./image-gallery-draft-controller-types";

interface UseImageGalleryTargetGuardOptions<TTarget> {
	isActive: boolean;
	isSameTarget: (left: TTarget | null, right: TTarget) => boolean;
	target: TTarget | null;
}

// Gallery actions are async and can outlive modal/target changes. This guard is
// the single place that defines whether a late completion may still update state.
export function useImageGalleryTargetGuard<TTarget>({
																											isActive,
																											isSameTarget,
																											target,
																										}: UseImageGalleryTargetGuardOptions<TTarget>): ImageGalleryTargetGuard<TTarget> {
	const isMountedRef    = useIsMountedRef();
	const latestTargetRef = useRef<TTarget | null>(target);
	const activeTargetRef = useRef<TTarget | null>(isActive ? target : null);

	latestTargetRef.current = target;
	activeTargetRef.current = isActive ? target : null;

	const isStillEditingTarget = useCallback(
		(activeTarget: TTarget) => isMountedRef.current && isSameTarget(
			activeTargetRef.current,
			activeTarget,
		),
		[
			isMountedRef,
			isSameTarget,
		],
	);

	return {
		isMountedRef,
		isStillEditingTarget,
		latestTargetRef,
	};
}
