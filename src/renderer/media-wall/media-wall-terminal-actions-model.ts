import type {
	MediaWallTerminalAction,
	MediaWallTerminalState,
} from "../types/media-wall";

export const TERMINAL_ACTION_DELAY_MS  = 520;
export const CARD_EXIT_ACTION_DELAY_MS = 190;

export type MediaWallTerminalActionDispatch =
	| {
	kind: "confirm";
	terminalState: MediaWallTerminalState;
}
	| {
	kind: "delayedRunning";
	delayMs: number;
	terminalState: MediaWallTerminalState;
}
	| {
	kind: "executeImmediately";
};

export function createMediaWallMenuTerminalState(index: number, nowMs: number): MediaWallTerminalState {
	return {
		kind:        "menu",
		index,
		startedAtMs: nowMs,
	};
}

function createMediaWallConfirmTerminalState(index: number, action: MediaWallTerminalAction, nowMs: number): MediaWallTerminalState {
	return {
		actionId:    action.id,
		kind:        "confirm",
		index,
		label:       action.label,
		message:     action.confirmMessage ?? "",
		startedAtMs: nowMs,
	};
}

function createMediaWallRunningTerminalState(index: number, action: MediaWallTerminalAction, nowMs: number): MediaWallTerminalState {
	return {
		actionId:    action.id,
		kind:        "running",
		index,
		label:       action.label,
		startedAtMs: nowMs,
	};
}

// Encodes terminal action policy without React timers so action behavior can be
// reviewed and tested apart from the hook that performs the side effects.
export function resolveMediaWallTerminalActionDispatch(params: {
	action: MediaWallTerminalAction;
	index: number;
	nowMs: number;
}): MediaWallTerminalActionDispatch {
	const {
					action,
					index,
					nowMs,
				} = params;
	if (action.confirmMessage) {
		return {
			kind:          "confirm",
			terminalState: createMediaWallConfirmTerminalState(
				index,
				action,
				nowMs,
			),
		};
	}
	if (action.id === "edit" || action.id === "refresh") {
		return {
			delayMs:       TERMINAL_ACTION_DELAY_MS,
			kind:          "delayedRunning",
			terminalState: createMediaWallRunningTerminalState(
				index,
				action,
				nowMs,
			),
		};
	}
	return { kind: "executeImmediately" };
}

export function resolveTerminalMenuReturnState(params: {
	actionId: string;
	currentState: MediaWallTerminalState | null;
	index: number;
	nowMs: number;
}): MediaWallTerminalState | null {
	const {
					actionId,
					currentState,
					index,
					nowMs,
				} = params;
	if (
		!currentState
		|| currentState.index !== index
		|| currentState.kind === "menu"
		|| currentState.actionId !== actionId
	) {
		return null;
	}

	return createMediaWallMenuTerminalState(
		index,
		nowMs,
	);
}
