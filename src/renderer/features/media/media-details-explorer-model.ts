export type MediaDetailsGroupSource = "official" | "user";

interface LibraryFilterSearch {
	genreNames?: string[];
	tagNames?: string[];
}

export function resolveMediaDetailsGroupSource(value: unknown): MediaDetailsGroupSource | undefined {
	return value === "official" || value === "user"
		? value
		: undefined;
}

export function createGenreLibraryFilterSearch(genreName: string): LibraryFilterSearch {
	return {
		genreNames: [ genreName ],
		tagNames:   undefined,
	};
}

export function createTagLibraryFilterSearch(tagName: string): LibraryFilterSearch {
	return {
		genreNames: undefined,
		tagNames:   [ tagName ],
	};
}

export function formatMediaDetailsLoadError(error: unknown): string {
	return error instanceof Error && error.message
		? error.message
		: "Failed to load media details.";
}

interface MediaDetailsWatchedStateSnapshot {
	mediaId: number;
	isWatched?: boolean;
}

// Optimistic detail updates must be scoped to the currently inspected media.
// Route changes can race with a pending watch-state write, so stale completions
// must leave the newer media snapshot untouched.
export function applyMediaDetailsWatchedState<TSnapshot extends MediaDetailsWatchedStateSnapshot>(
	current: TSnapshot | null,
	targetMediaId: number,
	isWatched: boolean,
): TSnapshot | null {
	return current?.mediaId === targetMediaId
		? {
			...current,
			isWatched,
		}
		: current;
}
