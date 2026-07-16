import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGalleryTab } from "@nimlat/types/ipc-payloads";
import type {
	Dispatch,
	MutableRefObject,
	SetStateAction,
} from "react";

export type GalleryActionResult =
	| { success: true }
	| {
	success: false;
	canceled?: boolean;
	error?: string;
};

export type GalleryUploadResult =
	| {
	success: true;
	candidateKey: string;
}
	| {
	success: false;
	error: string;
};

export type PickImageResult =
	| {
	success: true;
	imagePath: string;
}
	| {
	success: false;
	canceled?: boolean;
	error?: string;
};

export type GallerySelections = Record<ImageGalleryRole, string | undefined>;

export type GallerySelectionsSetter = Dispatch<SetStateAction<GallerySelections>>;

export type LoadImageGallery<TTarget> = (activeTarget: TTarget) => Promise<ImageGalleryTab[] | null>;

export interface ImageGalleryTargetGuard<TTarget> {
	isMountedRef: MutableRefObject<boolean>;
	isStillEditingTarget: (activeTarget: TTarget) => boolean;
	latestTargetRef: MutableRefObject<TTarget | null>;
}
