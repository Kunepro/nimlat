import type { RefObject } from "react";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type {
	MediaWallRenderer,
	MediaWallTerminalAction,
	MediaWallTerminalState,
} from "../types/media-wall";
import {
	CARD_EXIT_ACTION_DELAY_MS,
	createMediaWallMenuTerminalState,
	resolveMediaWallTerminalActionDispatch,
	resolveTerminalMenuReturnState,
} from "./media-wall-terminal-actions-model";

interface UsePixiMediaWallTerminalActionsProps<TItem> {
	clearCardActionInteractionRef: RefObject<() => void>;
	onMenuAction?: (item: TItem, index: number, actionId: string) => Promise<void> | void;
	renderer: MediaWallRenderer<TItem>;
}

export function usePixiMediaWallTerminalActions<TItem>({
																												 clearCardActionInteractionRef,
																												 onMenuAction,
																												 renderer,
																											 }: UsePixiMediaWallTerminalActionsProps<TItem>): {
	actionMenuOpenIndex: number | null;
	commitTerminalState: (nextState: MediaWallTerminalState | null) => void;
	executeTerminalAction: (item: TItem, index: number, action: MediaWallTerminalAction) => void;
	resetTerminalInteraction: () => void;
	runTerminalAction: (item: TItem, index: number, action: MediaWallTerminalAction) => void;
	terminalState: MediaWallTerminalState | null;
	updateActionMenuOpenIndex: (index: number, open: boolean) => void;
} {
	const [ terminalState, setTerminalState ] = useState<MediaWallTerminalState | null>(null);
	const terminalStateRef                    = useRef<MediaWallTerminalState | null>(null);
	const terminalActionTimeoutRef            = useRef<number | null>(null);
	const visibilityActionTimeoutRef          = useRef<number | null>(null);

	const clearTerminalActionTimers = useCallback(
		() => {
			if (terminalActionTimeoutRef.current !== null) {
				window.clearTimeout(terminalActionTimeoutRef.current);
				terminalActionTimeoutRef.current = null;
			}
			if (visibilityActionTimeoutRef.current !== null) {
				window.clearTimeout(visibilityActionTimeoutRef.current);
				visibilityActionTimeoutRef.current = null;
			}
		},
		[],
	);

	useEffect(
		() => clearTerminalActionTimers,
		[ clearTerminalActionTimers ],
	);

	const commitTerminalState = useCallback(
		(nextState: MediaWallTerminalState | null) => {
			terminalStateRef.current = nextState;
			setTerminalState(nextState);
			renderer.setActionTerminalState(nextState);
			renderer.render();
		},
		[ renderer ],
	);

	const resetTerminalInteraction = useCallback(
		() => {
			clearTerminalActionTimers();
			commitTerminalState(null);
		},
		[
			clearTerminalActionTimers,
			commitTerminalState,
		],
	);

	const updateActionMenuOpenIndex = useCallback(
		(index: number, open: boolean) => {
			commitTerminalState(open ? createMediaWallMenuTerminalState(
				index,
				performance.now(),
			) : null);
		},
		[ commitTerminalState ],
	);

	const returnTerminalToMenuIfStillActive = useCallback(
		(index: number, actionId: string) => {
			const nextState = resolveTerminalMenuReturnState({
				actionId,
				currentState: terminalStateRef.current,
				index,
				nowMs:        performance.now(),
			});
			if (!nextState) {
				return;
			}

			commitTerminalState(nextState);
		},
		[ commitTerminalState ],
	);

	const executeTerminalAction = useCallback(
		(item: TItem, index: number, action: MediaWallTerminalAction) => {
			if (!onMenuAction) {
				return;
			}
			if (visibilityActionTimeoutRef.current !== null) {
				window.clearTimeout(visibilityActionTimeoutRef.current);
				visibilityActionTimeoutRef.current = null;
			}

			const runAction = () => Promise.resolve(onMenuAction(
				item,
				index,
				action.id,
			));

			if (action.exitCardBeforeRun) {
				commitTerminalState(null);
				clearCardActionInteractionRef.current();
				renderer.setExitingIndex(index);
				renderer.render();
				visibilityActionTimeoutRef.current = window.setTimeout(
					() => {
						visibilityActionTimeoutRef.current = null;
						void runAction().finally(() => {
							renderer.setExitingIndex(null);
							renderer.render();
						});
					},
					CARD_EXIT_ACTION_DELAY_MS,
				);
				return;
			}

			if (action.closeMenuBeforeRun) {
				commitTerminalState(null);
				clearCardActionInteractionRef.current();
				void runAction();
				return;
			}

			void runAction().finally(() => {
				returnTerminalToMenuIfStillActive(
					index,
					action.id,
				);
			});
		},
		[
			clearCardActionInteractionRef,
			commitTerminalState,
			onMenuAction,
			renderer,
			returnTerminalToMenuIfStillActive,
		],
	);

	const runTerminalAction = useCallback(
		(item: TItem, index: number, action: MediaWallTerminalAction) => {
			if (!onMenuAction) {
				return;
			}
			if (terminalActionTimeoutRef.current !== null) {
				window.clearTimeout(terminalActionTimeoutRef.current);
				terminalActionTimeoutRef.current = null;
			}
			const actionDispatch = resolveMediaWallTerminalActionDispatch({
				action,
				index,
				nowMs: performance.now(),
			});
			if (actionDispatch.kind === "confirm") {
				commitTerminalState(actionDispatch.terminalState);
				return;
			}
			if (actionDispatch.kind === "delayedRunning") {
				commitTerminalState(actionDispatch.terminalState);
				terminalActionTimeoutRef.current = window.setTimeout(
					() => {
						terminalActionTimeoutRef.current = null;
						void Promise.resolve(onMenuAction(
							item,
							index,
							action.id,
						)).finally(() => {
							returnTerminalToMenuIfStillActive(
								index,
								action.id,
							);
						});
					},
					actionDispatch.delayMs,
				);
				return;
			}
			executeTerminalAction(
				item,
				index,
				action,
			);
		},
		[
			commitTerminalState,
			executeTerminalAction,
			onMenuAction,
			returnTerminalToMenuIfStillActive,
		],
	);

	return {
		actionMenuOpenIndex: terminalState?.index ?? null,
		commitTerminalState,
		executeTerminalAction,
		resetTerminalInteraction,
		runTerminalAction,
		terminalState,
		updateActionMenuOpenIndex,
	};
}
