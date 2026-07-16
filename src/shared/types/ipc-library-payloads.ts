import type {
	DisplayImageOrientation,
	ResolvedImageSource,
} from "./anime-db-images";
import type { IntegrationStatus } from "./anime-db-integration";
import type {
	MediaWallLoadedRange,
	MediaWallRangeRequest,
} from "./media-wall";
import type {
	GroupRef,
	LibraryItemKey,
	LibraryItemKind,
	MediaId,
} from "./nimlat-ids";
import type { LibraryDisplayFilters } from "./user-config";

export interface GroupExplorerCard {
	id: number;
	name: string;
	description?: string;
	baseMediaId?: MediaId;
	imageUrl?: string;
	// Integration percent is the computed tracked-progress percentage for the Group.
	integrationPercent?: number | null;
	integrationStatus?: IntegrationStatus | null;
	lastRefresh: string;
}

export interface GroupExplorerCardsPage {
	cards: GroupExplorerCard[];
	nextOffset: number | null;
	total: number;
}

export type LibraryDisplayScope = "library" | "ignored";

// Mixed top-level Library row that can represent either a Group container or one standalone Media.
// The explicit discriminator avoids relying on one shared numeric namespace for navigation and mutations.
export interface LibraryDisplayItem {
	key: LibraryItemKey;
	kind: LibraryItemKind;
	name: string;
	description?: string;
	imageUrl?: string;
	displayImageUrl?: string;
	displayImageSource?: ResolvedImageSource;
	displayImageOrientation?: DisplayImageOrientation;
	format?: string;
	isAdult?: boolean;
	isFilm?: boolean;
	isWatched?: boolean;
	integrationPercent?: number | null;
	integrationStatus?: IntegrationStatus | null;
	lastRefresh: string;
	group?: GroupRef;
	mediaId?: MediaId;
	mediasCount?: number;
}

export interface LibraryDisplayItemsPage {
	items: LibraryDisplayItem[];
	nextOffset: number | null;
	total: number;
}

export interface LibraryFilterOptions {
	genreNames: string[];
	tagNames: string[];
}

export interface LibraryDisplayItemsRangeRequest extends MediaWallRangeRequest, Partial<LibraryDisplayFilters> {
	scope?: LibraryDisplayScope;
}

export type LibraryDisplayItemsRange = MediaWallLoadedRange<LibraryDisplayItem>;

export interface GroupListChangedEvent {
	affectedGroups?: GroupRef[];
}
