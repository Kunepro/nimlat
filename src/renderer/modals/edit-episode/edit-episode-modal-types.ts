import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { EditDetailsFormValues } from "../shared/EditDetailsMetadataForm";

export interface EditEpisodeFormValues extends EditDetailsFormValues {
	description?: string;
}

export type EditEpisodeGallerySelections = Record<ImageGalleryRole, string | undefined>;
