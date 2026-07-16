import type { ImageGalleryRole } from "@nimlat/types/anime-db";

export interface EditMediaFormValues {
	name: string;
	description?: string;
}

export type EditMediaGallerySelections = Record<ImageGalleryRole, string | undefined>;
