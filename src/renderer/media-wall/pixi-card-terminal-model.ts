import type {
	MediaWallTerminalAction,
	MediaWallTerminalMeta,
	MediaWallTerminalState,
} from "../types/media-wall";

export const TERMINAL_TEXT_LINE_COUNT   = 13;
export const TERMINAL_TRANSITION_MS     = 260;
export const TERMINAL_TYPEWRITER_MS_PER_CHAR = 38;
const TERMINAL_RUNNING_DOT_INTERVAL_MS  = 260;
const TERMINAL_COLLAPSED_LINE_THRESHOLD = 0.82;
export const TERMINAL_COMMAND_Y         = 18;
export const TERMINAL_META_START_Y      = 38;
export const TERMINAL_META_ROW_HEIGHT   = 14;
export const TERMINAL_ACTION_START_Y    = 112;
export const TERMINAL_ACTION_ROW_HEIGHT = 24;
export const TERMINAL_CONFIRM_CHOICE_Y  = 104;

export type TerminalTextColorRole = "primary" | "meta" | "amber" | "danger" | "disabled";

export type TerminalTextRow = {
	colorRole: TerminalTextColorRole;
	index: number;
	text: string;
	yOffset: number;
};

export type TerminalPanelTransition = {
	progress: number;
	visibleScale: number;
	panelHeight: number;
	panelY: number;
	isHidden: boolean;
	isCollapsedLineOnly: boolean;
};

function clampUnit(value: number): number {
	return Math.min(
		1,
		Math.max(
			0,
			value,
		),
	);
}

// Keep terminal animation decisions deterministic so Pixi drawing stays a thin projection of state.
export function resolveTerminalPanelTransition(params: {
	actionMenuOpen: boolean;
	hasMappedItem: boolean;
	nowMs: number;
	posterHeight: number;
	posterY: number;
	transitionStartedAt: number | null;
}): TerminalPanelTransition {
	const {
					actionMenuOpen,
					hasMappedItem,
					nowMs,
					posterHeight,
					posterY,
					transitionStartedAt,
				}        = params;
	const elapsed  = transitionStartedAt === null
		? TERMINAL_TRANSITION_MS
		: nowMs - transitionStartedAt;
	const progress = clampUnit(elapsed / TERMINAL_TRANSITION_MS);
	if (!hasMappedItem || (!actionMenuOpen && progress >= 1)) {
		return {
			isCollapsedLineOnly: false,
			isHidden:            true,
			panelHeight:         0,
			panelY:              posterY,
			progress,
			visibleScale:        0,
		};
	}

	const visibleScale = actionMenuOpen
		? progress
		: 1 - progress;
	const panelHeight  = Math.max(
		2,
		posterHeight * visibleScale,
	);
	return {
		isCollapsedLineOnly: visibleScale < TERMINAL_COLLAPSED_LINE_THRESHOLD,
		isHidden:            false,
		panelHeight,
		panelY:              posterY + ((posterHeight - panelHeight) / 2),
		progress,
		visibleScale,
	};
}

export function formatTerminalLine(label: string, value: string): string {
	if (!value) {
		return label;
	}
	return `${ label }: ${ value }`;
}

export function getTerminalStateKey(state: MediaWallTerminalState | null): string {
	if (!state) {
		return "closed";
	}
	if (state.kind === "confirm") {
		return `${ state.kind }:${ state.index }:${ state.actionId }`;
	}
	if (state.kind === "running") {
		return `${ state.kind }:${ state.index }:${ state.actionId }`;
	}
	return `${ state.kind }:${ state.index }`;
}

export function getTerminalRunningDotCount(startedAtMs: number, nowMs: number): number {
	const elapsed = Math.max(
		0,
		nowMs - startedAtMs,
	);
	return (Math.floor(elapsed / TERMINAL_RUNNING_DOT_INTERVAL_MS) % 3) + 1;
}

export function getTerminalConfirmVisibleChars(params: {
	messageLength: number;
	nowMs: number;
	startedAtMs: number;
}): number {
	const {
					messageLength,
					nowMs,
					startedAtMs,
				}       = params;
	const elapsed = Math.max(
		0,
		nowMs - startedAtMs,
	);
	return Math.min(
		Math.max(
			0,
			messageLength,
		),
		Math.floor(elapsed / TERMINAL_TYPEWRITER_MS_PER_CHAR),
	);
}

function getActionColorRole(action: MediaWallTerminalAction): TerminalTextColorRole {
	if (action.danger) {
		return "danger";
	}
	return action.disabled
		? "disabled"
		: "primary";
}

function buildTerminalMetaRows(meta: readonly MediaWallTerminalMeta[]): TerminalTextRow[] {
	return meta
		.slice(
			0,
			6,
		)
		.map((line, index) => ({
			colorRole: "meta",
			index:     index + 1,
			text:      formatTerminalLine(
				line.label,
				line.value,
			),
			yOffset:   TERMINAL_META_START_Y + index * TERMINAL_META_ROW_HEIGHT,
		}));
}

function buildTerminalActionRows(actions: readonly MediaWallTerminalAction[]): TerminalTextRow[] {
	return actions
		.slice(
			0,
			5,
		)
		.map((action, index) => ({
			colorRole: getActionColorRole(action),
			index:     index + 7,
			text:      `${ action.loading ? "..." : ">" } ${ action.label }`,
			yOffset:   TERMINAL_ACTION_START_Y + index * TERMINAL_ACTION_ROW_HEIGHT,
		}));
}

// Text rows are modeled without Pixi objects so hit testing, timing, and copy can be covered by regular unit tests.
export function buildTerminalTextRows(params: {
	actions: readonly MediaWallTerminalAction[];
	meta: readonly MediaWallTerminalMeta[];
	nowMs: number;
	terminalState: MediaWallTerminalState | null;
}): TerminalTextRow[] {
	const {
					actions,
					meta,
					nowMs,
					terminalState,
				}                       = params;
	const rows: TerminalTextRow[] = [
		{
			colorRole: "primary",
			index:     0,
			text:      "$ nimlatctl card",
			yOffset:   TERMINAL_COMMAND_Y,
		},
	];

	if (terminalState?.kind === "running") {
		const dotCount = getTerminalRunningDotCount(
			terminalState.startedAtMs,
			nowMs,
		);
		rows.push(
			{
				colorRole: "amber",
				index:     1,
				text:      `running ${ ".".repeat(dotCount) }`,
				yOffset:   TERMINAL_META_START_Y + TERMINAL_META_ROW_HEIGHT,
			},
			{
				colorRole: "meta",
				index:     2,
				text:      `exec ${ terminalState.label.toLowerCase() }`,
				yOffset:   TERMINAL_META_START_Y + 32,
			},
		);
		return rows;
	}

	if (terminalState?.kind === "confirm") {
		const visibleChars = getTerminalConfirmVisibleChars({
			messageLength: terminalState.message.length,
			nowMs,
			startedAtMs:   terminalState.startedAtMs,
		});
		rows.push(
			{
				colorRole: "meta",
				index:     1,
				text:      `> ${ terminalState.label.toLowerCase() }`,
				yOffset:   TERMINAL_META_START_Y + 8,
			},
			{
				colorRole: "amber",
				index:     2,
				text:      `> ${ terminalState.message.slice(
					0,
					visibleChars,
				) }${ visibleChars < terminalState.message.length ? "_" : "" }`,
				yOffset:   TERMINAL_META_START_Y + 32,
			},
		);
		if (visibleChars >= terminalState.message.length) {
			rows.push({
				colorRole: "primary",
				index:     3,
				text:      "YES  |  NO",
				yOffset:   TERMINAL_CONFIRM_CHOICE_Y,
			});
		}
		return rows;
	}

	return [
		...rows,
		...buildTerminalMetaRows(meta),
		...buildTerminalActionRows(actions),
	];
}
