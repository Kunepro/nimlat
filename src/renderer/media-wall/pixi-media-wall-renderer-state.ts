import type {
	MediaWallItem,
	MediaWallLoadedRange,
	MediaWallSize,
	MediaWallTerminalState,
} from "../types/media-wall";
import type { PixiMediaWallExitingCardTarget } from "./pixi-media-wall-card-state";

export interface PixiMediaWallRendererFrameState<TItem> {
	actionTerminalState: MediaWallTerminalState | null;
	exitingCardTarget: PixiMediaWallExitingCardTarget | null;
	focusedIndex: number | null;
	hoveredIndex: number | null;
	itemsRange: MediaWallLoadedRange<TItem>;
	projectorHoveredIndex: number | null;
	scrollTop: number;
	selectedIndex: number | null;
	selectedIndexes: ReadonlySet<number>;
}

// Owns renderer interaction state that is independent from Pixi lifecycle.
// The renderer can then focus on canvas resources, while this object keeps
// normalization rules such as clamped scroll/size and copied selection sets.
export class PixiMediaWallRendererState<TItem> {
	private size: MediaWallSize                                      = {
		width:  1,
		height: 1,
	};
	private itemsRange: MediaWallLoadedRange<TItem>                  = {
		offset: 0,
		total:  0,
		items:  [],
	};
	private scrollTop                                                = 0;
	private hoveredIndex: number | null                              = null;
	private projectorHoveredIndex: number | null                     = null;
	private actionTerminalState: MediaWallTerminalState | null       = null;
	private exitingCardTarget: PixiMediaWallExitingCardTarget | null = null;
	private selectedIndex: number | null                             = null;
	private selectedIndexes                                          = new Set<number>();
	private focusedIndex: number | null                              = null;

	public getSize(): MediaWallSize {
		return this.size;
	}

	public setSize(size: MediaWallSize): MediaWallSize {
		this.size = {
			width:  Math.max(
				1,
				Math.floor(size.width),
			),
			height: Math.max(
				1,
				Math.floor(size.height),
			),
		};
		return this.size;
	}

	public setItems(range: MediaWallLoadedRange<TItem>): void {
		this.itemsRange = range;
	}

	public setScrollTop(scrollTop: number): void {
		this.scrollTop = Math.max(
			0,
			scrollTop,
		);
	}

	public setHoveredIndex(index: number | null): void {
		this.hoveredIndex = index;
	}

	public setProjectorHoveredIndex(index: number | null): void {
		this.projectorHoveredIndex = index;
	}

	public setSelectedIndex(index: number | null): void {
		this.selectedIndex = index;
	}

	public setSelectedIndexes(indexes: ReadonlySet<number>): void {
		this.selectedIndexes = new Set(indexes);
	}

	public setActionTerminalState(state: MediaWallTerminalState | null): void {
		this.actionTerminalState = state;
	}

	public setFocusedIndex(index: number | null): void {
		this.focusedIndex = index;
	}

	public setExitingIndex(index: number | null, mapItem: (item: TItem) => MediaWallItem, nowMs: number): void {
		if (index === null) {
			this.exitingCardTarget = null;
			return;
		}

		const item             = this.getItemAt(index);
		const mappedItem       = item ? mapItem(item) : null;
		this.exitingCardTarget = mappedItem
			? {
				index,
				itemId:      mappedItem.id,
				startedAtMs: nowMs,
			}
			: null;
	}

	public getFrameState(): PixiMediaWallRendererFrameState<TItem> {
		return {
			actionTerminalState:   this.actionTerminalState,
			exitingCardTarget:     this.exitingCardTarget,
			focusedIndex:          this.focusedIndex,
			hoveredIndex:          this.hoveredIndex,
			itemsRange:            this.itemsRange,
			projectorHoveredIndex: this.projectorHoveredIndex,
			scrollTop:             this.scrollTop,
			selectedIndex:         this.selectedIndex,
			selectedIndexes:       this.selectedIndexes,
		};
	}

	private getItemAt(globalIndex: number): TItem | null {
		const localIndex = globalIndex - this.itemsRange.offset;
		return localIndex >= 0 && localIndex < this.itemsRange.items.length
			? this.itemsRange.items[ localIndex ] ?? null
			: null;
	}
}
