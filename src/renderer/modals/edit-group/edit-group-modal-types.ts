import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { EditDetailsFormValues } from "../shared/EditDetailsMetadataForm";

export type EditGroupFormValues = EditDetailsFormValues;

export type EditGroupGallerySelections = Record<ImageGalleryRole, string | undefined>;
