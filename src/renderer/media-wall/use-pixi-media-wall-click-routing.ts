import type {
	Dispatch,
	MouseEvent,
	SetStateAction,
} from "react";
import { useCallback } from "react";
import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallRenderer,
	MediaWallTerminalAction,
	MediaWallTerminalState,
	PixiMediaWallHostProps,
} from "../types/media-wall";
import { resolveMediaWallClickRoute } from "./media-wall-click-routing-model";
import { getRangeItem } from "./media-wall-host.utils";
import { getMediaWallItemViewportPosition } from "./media-wall-layout";
import { createMediaWallMenuTerminalState } from "./media-wall-terminal-actions-model";

interface MediaWallControllerRef<TValue> {
	current: TValue;
}

interface UsePixiMediaWallClickRoutingProps<TItem> {
	actionMenuOpenIndex: number | null;
	commitTerminalState: (nextState: MediaWallTerminalState | null) => void;
	executeTerminalAction: (item: TItem, index: number, action: MediaWallTerminalAction) => void;
	getItemMenuActionsRef: MediaWallControllerRef<PixiMediaWallHostProps<TItem>["getItemMenuActions"]>;
	hoveredIndex: number | null;
	layoutRef: MediaWallControllerRef<MediaWallLayout | null>;
	onMenuAction: PixiMediaWallHostProps<TItem>["onMenuAction"];
	onOpenItem: PixiMediaWallHostProps<TItem>["onOpenItem"];
	onSelectionToggle: PixiMediaWallHostProps<TItem>["onSelectionToggle"];
	onWatchStateToggle: PixiMediaWallHostProps<TItem>["onWatchStateToggle"];
	rangeRef: MediaWallControllerRef<MediaWallLoadedRange<TItem>>;
	renderer: MediaWallRenderer<TItem>;
	runTerminalAction: (item: TItem, index: number, action: MediaWallTerminalAction) => void;
	scrollTopRef: MediaWallControllerRef<number>;
	setOverlayScrollTop: Dispatch<SetStateAction<number>>;
	setSelectedIndex: Dispatch<SetStateAction<number | null>>;
	terminalState: MediaWallTerminalState | null;
	updateActionMenuOpenIndex: (index: number, open: boolean) => void;
}

export function usePixiMediaWallClickRouting<TItem>({
																											actionMenuOpenIndex,
																											commitTerminalState,
																											executeTerminalAction,
																											getItemMenuActionsRef,
																											hoveredIndex,
																											layoutRef,
																											onMenuAction,
																											onOpenItem,
																											onSelectionToggle,
																											onWatchStateToggle,
																											rangeRef,
																											renderer,
																											runTerminalAction,
																											scrollTopRef,
																											setOverlayScrollTop,
																											setSelectedIndex,
																											terminalState,
																											updateActionMenuOpenIndex,
																										}: UsePixiMediaWallClickRoutingProps<TItem>) {
	return useCallback(
		(event: MouseEvent<HTMLDivElement>) => {
			const currentLayout = layoutRef.current;
			if (!currentLayout) {
				return;
			}
			const bounds = event.currentTarget.getBoundingClientRect();
			const index  = hoveredIndex;
			if (index === null) {
				return;
			}
			const position = getMediaWallItemViewportPosition(
				currentLayout,
				index,
				scrollTopRef.current,
			);
			const item     = getRangeItem(
				rangeRef.current,
				index,
			);
			if (!position || !item) {
				return;
			}
			const localX           = event.clientX - bounds.left - position.x;
			const localY           = event.clientY - bounds.top - position.y;
			const isActionMenuOpen = actionMenuOpenIndex === index;
			const route            = resolveMediaWallClickRoute({
				actions:              isActionMenuOpen
																? getItemMenuActionsRef.current?.(item) ?? []
																: [],
				canSelect:            Boolean(onSelectionToggle),
				canToggleWatchState:  Boolean(onWatchStateToggle),
				hasMenuActionHandler: Boolean(onMenuAction),
				isActionMenuOpen,
				localX,
				localY,
				positionHeight:       position.height,
				positionWidth:        position.width,
				terminalState,
			});

			switch (route.kind) {
				case "none":
					return;
				case "toggleActionMenu":
					consumeMediaWallClick(event);
					updateActionMenuOpenIndex(
						index,
						!isActionMenuOpen,
					);
					return;
				case "toggleSelection":
					consumeMediaWallClick(event);
					onSelectionToggle?.(
						item,
						index,
					);
					return;
				case "terminalRunningBlock":
					consumeMediaWallClick(event);
					return;
				case "terminalConfirmNo":
					consumeMediaWallClick(event);
					commitTerminalState(createMediaWallMenuTerminalState(
						index,
						performance.now(),
					));
					return;
				case "terminalConfirmYes":
					consumeMediaWallClick(event);
					executeTerminalAction(
						item,
						index,
						route.action,
					);
					return;
				case "terminalAction":
					consumeMediaWallClick(event);
					runTerminalAction(
						item,
						index,
						route.action,
					);
					return;
				case "toggleWatchState":
					consumeMediaWallClick(event);
					onWatchStateToggle?.(
						item,
						index,
					);
					return;
				case "openItem":
					// Opening a card still commits the selected visual state first so the renderer and ARIA
					// active item stay aligned if route navigation is delayed by React work.
					setSelectedIndex(index);
					setOverlayScrollTop(scrollTopRef.current);
					renderer.setSelectedIndex(index);
					renderer.render();
					onOpenItem?.(
						item,
						index,
					);
			}
		},
		[
			actionMenuOpenIndex,
			commitTerminalState,
			executeTerminalAction,
			getItemMenuActionsRef,
			hoveredIndex,
			layoutRef,
			onMenuAction,
			onOpenItem,
			onSelectionToggle,
			onWatchStateToggle,
			rangeRef,
			renderer,
			runTerminalAction,
			scrollTopRef,
			setOverlayScrollTop,
			setSelectedIndex,
			terminalState,
			updateActionMenuOpenIndex,
		],
	);
}

function consumeMediaWallClick(event: MouseEvent<HTMLDivElement>): void {
	event.preventDefault();
	event.stopPropagation();
}
