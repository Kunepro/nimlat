// Provider identity and mapping confidence types are shared by catalog rows,
// ingestion services, and grouping reconcile code. Keep them schema-shaped:
// persisted enum values require an approved migration before changing.
export type ProviderName =
	| "anilist"
	| "mal";

export type ProviderMappingConfidence =
	| "seeded"
	| "inferred"
	| "verified"
	| "curated";

export type GroupLineageProviderMappingType =
	| "base_media_seed"
	| "curated_group";
