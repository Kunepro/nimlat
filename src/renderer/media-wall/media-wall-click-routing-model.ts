import type {
	MediaWallTerminalAction,
	MediaWallTerminalState,
} from "../types/media-wall";
import {
	getTerminalActionAtPoint,
	getTerminalConfirmChoiceAtPoint,
	isPointInsideActionMenuButton,
	isPointInsideSelectionPlaque,
	isPointInsideWatchedPlaque,
} from "./media-wall-hit-testing";

interface ResolveMediaWallClickRouteInput {
	actions: readonly MediaWallTerminalAction[];
	canSelect: boolean;
	canToggleWatchState: boolean;
	hasMenuActionHandler: boolean;
	isActionMenuOpen: boolean;
	localX: number;
	localY: number;
	positionHeight: number;
	positionWidth: number;
	terminalState: MediaWallTerminalState | null;
}

export type MediaWallClickRoute =
	| {
	kind: "none";
}
	| {
	kind: "openItem";
}
	| {
	kind: "terminalAction";
	action: MediaWallTerminalAction;
}
	| {
	kind: "terminalConfirmNo";
}
	| {
	kind: "terminalConfirmYes";
	action: MediaWallTerminalAction;
}
	| {
	kind: "terminalRunningBlock";
}
	| {
	kind: "toggleActionMenu";
}
	| {
	kind: "toggleSelection";
}
	| {
	kind: "toggleWatchState";
};

// Click precedence mirrors the physical card shell: chrome buttons first,
// terminal surface next, then card-level actions. Keeping it pure makes future
// hit-target changes safer than editing a long event handler directly.
export function resolveMediaWallClickRoute({
																						 actions,
																						 canSelect,
																						 canToggleWatchState,
																						 hasMenuActionHandler,
																						 isActionMenuOpen,
																						 localX,
																						 localY,
																						 positionHeight,
																						 positionWidth,
																						 terminalState,
																					 }: ResolveMediaWallClickRouteInput): MediaWallClickRoute {
	if (isPointInsideActionMenuButton(
		localX,
		localY,
		positionWidth,
	)) {
		return { kind: "toggleActionMenu" };
	}

	if (canSelect && isPointInsideSelectionPlaque(
		localX,
		localY,
		positionWidth,
	)) {
		return { kind: "toggleSelection" };
	}

	if (isActionMenuOpen) {
		return resolveOpenTerminalClickRoute({
			actions,
			hasMenuActionHandler,
			localX,
			localY,
			positionHeight,
			positionWidth,
			terminalState,
		});
	}

	if (canToggleWatchState && isPointInsideWatchedPlaque(
		localX,
		localY,
		positionHeight,
	)) {
		return { kind: "toggleWatchState" };
	}

	return { kind: "openItem" };
}

function resolveOpenTerminalClickRoute({
																				 actions,
																				 hasMenuActionHandler,
																				 localX,
																				 localY,
																				 positionHeight,
																				 positionWidth,
																				 terminalState,
																			 }: Pick<
	ResolveMediaWallClickRouteInput,
	| "actions"
	| "hasMenuActionHandler"
	| "localX"
	| "localY"
	| "positionHeight"
	| "positionWidth"
	| "terminalState"
>): MediaWallClickRoute {
	if (terminalState?.kind === "running") {
		return { kind: "terminalRunningBlock" };
	}

	if (terminalState?.kind === "confirm") {
		const choice = getTerminalConfirmChoiceAtPoint(
			localX,
			localY,
			positionWidth,
			positionHeight,
		);
		if (choice === "no") {
			return { kind: "terminalConfirmNo" };
		}
		if (choice === "yes") {
			const action = actions.find((candidate) => candidate.id === terminalState.actionId);
			return action
				? {
					kind: "terminalConfirmYes",
					action,
				}
				: { kind: "none" };
		}
		return { kind: "none" };
	}

	const action = getTerminalActionAtPoint(
		actions,
		localX,
		localY,
		positionWidth,
		positionHeight,
	);
	return action && hasMenuActionHandler
		? {
			kind: "terminalAction",
			action,
		}
		: { kind: "none" };
}
