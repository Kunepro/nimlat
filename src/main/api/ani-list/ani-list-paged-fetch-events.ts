type AniListPagedFetchProgressEvent = {
	kind: "page-requested";
	page: number;
	hasNextPage: boolean;
};

export type AniListFetchCompletedEvent<TItems> = {
	kind: "completed";
	items: TItems;
};

export type AniListPagedFetchEvent<TItems> =
	| AniListPagedFetchProgressEvent
	| AniListFetchCompletedEvent<TItems>;

// Type guard for consumers that turn an event stream back into the final payload.
export function isAniListFetchCompletedEvent<TItems>(
	event: AniListPagedFetchEvent<TItems>,
): event is AniListFetchCompletedEvent<TItems> {
	return event.kind === "completed";
}
