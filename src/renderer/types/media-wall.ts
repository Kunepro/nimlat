import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	MediaWallLoadedRange,
	MediaWallRangeRequest,
} from "@nimlat/types/media-wall";
import type { Texture } from "pixi.js";
import type {
	KeyboardEvent,
	MouseEvent,
	PointerEvent,
	ReactNode,
	RefObject,
} from "react";

export interface MediaWallLayoutConfig {
	minColumns: number;
	maxColumns: number;
	targetCardWidth: number;
	minCardWidth: number;
	maxCardWidth: number;
	posterAspectRatio: number;
	bodyHeight: number;
	horizontalGap: number;
	verticalGap: number;
	contentInsetTop: number;
	contentInsetBottom: number;
	contentInsetHorizontal: number;
	overscanRows: number;
}

export interface MediaWallLayoutInput {
	viewportWidth: number;
	viewportHeight: number;
	itemCount: number;
	config?: Partial<MediaWallLayoutConfig>;
}

export interface MediaWallLayout {
	viewportWidth: number;
	viewportHeight: number;
	itemCount: number;
	cardWidth: number;
	posterHeight: number;
	bodyHeight: number;
	cardHeight: number;
	horizontalGap: number;
	verticalGap: number;
	columns: number;
	rowHeight: number;
	totalRows: number;
	totalHeight: number;
	gridWidth: number;
	xOrigin: number;
	contentInsetTop: number;
	contentInsetBottom: number;
	contentInsetHorizontal: number;
	overscanRows: number;
}

export interface MediaWallVisibleRange {
	firstRow: number;
	lastRowExclusive: number;
	firstIndex: number;
	lastIndexExclusive: number;
}

export interface MediaWallItemViewportPosition {
	index: number;
	row: number;
	column: number;
	columns: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface MediaWallPoint {
	x: number;
	y: number;
}

export interface MediaWallSize {
	width: number;
	height: number;
}

export type {
	MediaWallLoadedRange,
	MediaWallRangeRequest,
};

export interface MediaWallTerminalAction {
	id: string;
	label: string;
	// Visibility-changing actions close the Pixi terminal before they mutate the list,
	// so the same global index cannot accidentally target the next card after reload.
	closeMenuBeforeRun?: boolean;
	// Dangerous Pixi terminal actions stay inside the shell: clicking the row opens
	// a typed confirmation prompt instead of delegating to Ant modals or closing the card.
	confirmMessage?: string;
	danger?: boolean;
	disabled?: boolean;
	exitCardBeforeRun?: boolean;
	loading?: boolean;
}

export interface MediaWallTerminalMeta {
	label: string;
	value: string;
}

export type MediaWallTerminalState =
	| {
	kind: "menu";
	index: number;
	startedAtMs: number;
}
	| {
	actionId: string;
	kind: "confirm";
	index: number;
	label: string;
	message: string;
	startedAtMs: number;
}
	| {
	actionId: string;
	kind: "running";
	index: number;
	label: string;
	startedAtMs: number;
};

export interface MediaWallDataSource<TItem> {
	loadRange(request: MediaWallRangeRequest): Promise<MediaWallLoadedRange<TItem>>;
}

export interface MediaWallItem {
	id: string;
	title: string;
	subtitle?: string;
	description?: string;
	thumbnailUrl?: string;
	progressPercent?: number;
	integrationStatus?: IntegrationStatus | null;
	integrationStatusUpdating?: boolean;
	badges?: readonly string[];
	isAdult?: boolean;
	isWatched?: boolean;
	mediaCount?: number;
	menuActions?: readonly MediaWallTerminalAction[];
	menuMeta?: readonly MediaWallTerminalMeta[];
	kind: "library" | "ignored" | "group-media";
}

export interface MediaWallProjectorOverlayItem<TItem> {
	index: number;
	item: TItem;
	x: number;
	y: number;
	width: number;
	height: number;
	trackingMenuOffsetPx: number;
	onProjectorOverlayOpenChange: (open: boolean) => void;
}

export interface MediaWallDiagnosticsSnapshot {
	mounted: boolean;
	viewportWidth: number;
	viewportHeight: number;
	scrollTop: number;
	totalItems: number;
	totalRows: number;
	visibleFirstIndex: number;
	visibleLastIndexExclusive: number;
	visibleCount: number;
	poolSize: number;
	rangeOffset: number;
	rangeLength: number;
	textureCacheSize: number;
	pendingThumbnailCount: number;
	failedThumbnailCount: number;
	visibleThumbnailUrlCount: number;
	visibleTextureCount: number;
	thumbnailLoadAttemptCount: number;
	thumbnailLoadSuccessCount: number;
	lastThumbnailLoadUrl?: string;
	lastThumbnailResolvedLoadUrl?: string;
	lastThumbnailLoadOutcome?: string;
	lastThumbnailLoadDetail?: string;
	lastRenderMs: number;
	averageFps: number;
	droppedFrameEstimate: number;
}

export interface MediaWallRenderer<TItem> {
	// Pixi v8 initialization is asynchronous, so mount returns a promise even though callers provide a ready DOM node.
	mount(container: HTMLElement): Promise<void>;

	resize(size: MediaWallSize): void;

	setItems(range: MediaWallLoadedRange<TItem>): void;

	setScrollTop(scrollTop: number): void;

	setHoveredIndex(index: number | null): void;

	setProjectorHoveredIndex(index: number | null): void;

	setSelectedIndex(index: number | null): void;

	setSelectedIndexes(indexes: ReadonlySet<number>): void;

	setActionTerminalState(state: MediaWallTerminalState | null): void;

	setExitingIndex(index: number | null): void;

	setFocusedIndex(index: number | null): void;

	setDiagnosticsEnabled(enabled: boolean): void;

	render(): void;

	getDiagnostics(): MediaWallDiagnosticsSnapshot;

	destroy(): void;
}

export interface PixiMediaWallHostProps<TItem> {
	ariaLabel: string;
	dataKey: string;
	dataSource: MediaWallDataSource<TItem>;
	search: string;
	className?: string;
	testId?: string;
	reloadKey?: string | number;
	visualStateKey?: string | number;
	maximumRequestItems?: number;
	renderer?: MediaWallRenderer<TItem>;
	getItemAriaLabel?: (item: TItem) => string;
	getItemSelected?: (item: TItem) => boolean;
	getItemMenuActions?: (item: TItem) => readonly MediaWallTerminalAction[];
	renderProjectorOverlay?: (activeItem: MediaWallProjectorOverlayItem<TItem>) => ReactNode;
	onOpenItem?: (item: TItem, index: number) => void;
	onMenuAction?: (item: TItem, index: number, actionId: string) => Promise<void> | void;
	onSelectionToggle?: (item: TItem, index: number) => void;
	onWatchStateToggle?: (item: TItem, index: number) => void;
	onRangeLoaded?: (range: MediaWallLoadedRange<TItem>) => void;
	onRangeLoadError?: (error: unknown) => void;
	diagnosticsMode?: "auto" | "off" | "on";
}

export interface PixiMediaWallViewModel<TItem> {
	activeAriaLabel: string;
	activeIndex: number | null;
	ariaLabel: string;
	className?: string;
	diagnosticsSnapshot: MediaWallDiagnosticsSnapshot;
	getItemAriaLabel?: (item: TItem) => string;
	handleClick: (event: MouseEvent<HTMLDivElement>) => void;
	handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
	handlePointerLeave: (event: PointerEvent<HTMLDivElement>) => void;
	handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
	handleProjectorOverlayAction: () => void;
	handleProjectorOverlayPointerLeave: (event: PointerEvent<HTMLDivElement>) => void;
	handleProjectorOverlayPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
	handleScroll: () => void;
	handleVisualScrollbarPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
	handleVisualScrollbarPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
	handleVisualScrollbarPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
	hasVerticalOverflow: boolean;
	hoveredIndex: number | null;
	isDiagnosticsEnabled: boolean;
	layout: MediaWallLayout;
	pixiLayerRef: RefObject<HTMLDivElement | null>;
	projectorOverlayItem: MediaWallProjectorOverlayItem<TItem> | null;
	projectorOverlayStyle?: {
		display: string;
		transform: string;
		width: number;
		height: number;
		"--projector-tracking-menu-offset": string;
		"--projector-tracking-menu-width": string;
	};
	rangeState: MediaWallLoadedRange<TItem>;
	renderProjectorOverlay?: (activeItem: MediaWallProjectorOverlayItem<TItem>) => ReactNode;
	scrollbarThumbHeight: number;
	scrollbarThumbTop: number;
	scrollContainerRef: RefObject<HTMLDivElement | null>;
	scrollTop: number;
	size: MediaWallSize;
	spacerHeight: number;
	testId?: string;
	visualScrollbarRef: RefObject<HTMLDivElement | null>;
	visualScrollbarThumbRef: RefObject<HTMLDivElement | null>;
}

export interface ThumbnailTextureCacheOptions {
	maxEntries?: number;
	loadTexture?: (thumbnailUrl: string) => Promise<Texture>;
	unloadTexture?: (thumbnailUrl: string, texture: Texture) => Promise<void>;
}
