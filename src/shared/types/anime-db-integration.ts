// Stored user intent for Nimlat integration tracking.
// It is changed through immediate UI interactions, while integration percentages stay derived.
export type IntegrationStatus =
	| "ignored"
	| "tracked"
	| "downloading"
	| "downloaded"
	| "integrated";

export type PlaybackIssueCategory =
	| "dub"
	| "sub"
	| "encoding"
	| "audio"
	| "video";
