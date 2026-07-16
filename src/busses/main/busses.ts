import type {
	CatalogMediaIngestedEvent,
	ImageOwnerKind,
	ImageRole,
} from "@nimlat/types/anime-db";
import type { AppUpdateStatus } from "@nimlat/types/app-update";
import {
	ExternalTrackingAccountsChangedEvent,
	ExternalTrackingExportProgressEvent,
	MediaWatchListChangedEvent,
} from "@nimlat/types/external-tracking";
import {
	AnimeDbDownloadProgressData,
	AnimeDbUpdateProgressData,
	GroupListChangedEvent,
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
	HydratorProgressEvent,
	MediaEpisodesItemsPatchedEvent,
	MediaEpisodesListChangedEvent,
	PopulateAnimeDbProgressData,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import type { ReleaseWatchListChangedEvent } from "@nimlat/types/release-watch";
import type { ToasterMessageEvent } from "@nimlat/types/toaster";
import type {
	BackgroundStyle,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import {
	BehaviorSubject,
	Subject,
} from "rxjs";
import { ActionsNetwork } from "./actions/actions-network";

export type ImageDisplayTarget =
	| {
	kind: "media";
	mediaId: number;
}
	| {
	kind: "group";
	group: GroupRef;
}
	| {
	kind: "episode";
	mediaId: number;
}
	| {
	kind: "none";
};

export interface ImageCacheEntryReadyEvent {
	cacheKey: string;
	ownerKind: ImageOwnerKind;
	ownerId: string;
	imageRole: ImageRole;
	displayTarget: ImageDisplayTarget;
}

export interface ImageDisplayTargetChangedEvent {
	reason: "gallery-selection-changed" | "gallery-upload-changed";
	displayTarget: ImageDisplayTarget;
}

export const BUS_Network = new BehaviorSubject(ActionsNetwork.connectionChanged({ isOnline: false }));
export const BUS_HydratorQueueChanges = new Subject<void>();
export const BUS_HydratorProgress = new Subject<HydratorProgressEvent>();
// Keep the SQLite handle opaque at the bus boundary; only src/database narrows it
// back to better-sqlite3 so driver details do not leak through main-process events.
export const BUS_Database = new BehaviorSubject<unknown | null>(null);

// Long-running main-process workflows publish progress/status here. IPC bridges
// own renderer transport so services remain agnostic of Electron windows.
export const BUS_AnimeDbDownloadProgress = new Subject<AnimeDbDownloadProgressData>();
export const BUS_AnimeDbUpdateProgress   = new Subject<AnimeDbUpdateProgressData>();
export const BUS_PopulateAnimeDbProgress = new Subject<PopulateAnimeDbProgressData>();
export const BUS_AppUpdateStatusChanged  = new Subject<AppUpdateStatus>();
export const BUS_AniListQueuePaused      = new Subject<number>();

// Services publish renderer-facing toast intent here; IPC bridges own delivery.
export const BUS_ToasterMessage = new Subject<ToasterMessageEvent>();

// User preferences are persisted in user_data, then published here so renderer
// notification policy stays in IPC bridges instead of config handlers/services.
export const BUS_ConfigAdultContentChanged           = new Subject<boolean>();
export const BUS_ConfigBackgroundStyleChanged        = new Subject<BackgroundStyle>();
export const BUS_ConfigPreferredTitleLanguageChanged = new Subject<PreferredTitleLanguage>();
export const BUS_ConfigCanvasDiagnosticsChanged      = new Subject<boolean>();

// Semantic catalog-ingestion event. Producers publish this once after a canonical Media upsert;
// grouping, release-watch, and renderer invalidation subscribe instead of being called directly.
export const BUS_CatalogMediaIngested = new Subject<CatalogMediaIngestedEvent>();

// Provider/local image cache readiness is a domain event. Image-cache work should
// not know which renderer lists must be invalidated for each display surface.
export const BUS_ImageCacheEntryReady = new Subject<ImageCacheEntryReadyEvent>();

// User-controlled image gallery mutations are also image-domain events. Renderer
// invalidation policy stays in the image event subscriber instead of gallery services.
export const BUS_ImageDisplayTargetChanged = new Subject<ImageDisplayTargetChangedEvent>();

// Signals changes to the Group/Library list composition (create/delete/re-home affecting total/order).
export const BUS_GroupListChanged = new Subject<GroupListChangedEvent>();

// Signals changes to media list composition for one or more Group inspection pages.
export const BUS_GroupMediaListChanged = new Subject<GroupMediaListChangedEvent>();

// Signals partial patch updates for media cards shown in Group inspection pages.
export const BUS_GroupMediaItemsPatched = new Subject<GroupMediaItemsPatchedEvent>();

// Signals structural changes in a media episode list (new rows/deletions/re-order).
export const BUS_MediaEpisodesListChanged = new Subject<MediaEpisodesListChangedEvent>();

// Signals partial patch updates for existing episode rows.
export const BUS_MediaEpisodesItemsPatched = new Subject<MediaEpisodesItemsPatchedEvent>();

// Watched status is its own local-first domain and must not be folded into
// media-library integration events.
export const BUS_MediaWatchListChanged = new Subject<MediaWatchListChangedEvent>();

// Preferences account state changes are published here; IPC bridges fan out to renderer.
export const BUS_ExternalTrackingAccountsChanged = new Subject<ExternalTrackingAccountsChangedEvent>();
// Explicit exports publish transient progress only; this is never persisted or
// interpreted as authorization to resume work after the clicked action ends.
export const BUS_ExternalTrackingExportProgress = new Subject<ExternalTrackingExportProgressEvent>();

// Signals that the persisted past release-watch list changed and renderer readers should reload.
export const BUS_ReleaseWatchPastListChanged = new Subject<ReleaseWatchListChangedEvent>();

// Signals that the persisted upcoming release-watch list changed and renderer readers should reload.
export const BUS_ReleaseWatchUpcomingListChanged = new Subject<ReleaseWatchListChangedEvent>();
