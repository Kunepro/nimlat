// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import type { MediaWallTerminalState } from "../types/media-wall";
import {
	buildTerminalTextRows,
	formatTerminalLine,
	getTerminalConfirmVisibleChars,
	getTerminalRunningDotCount,
	getTerminalStateKey,
	resolveTerminalPanelTransition,
	TERMINAL_ACTION_ROW_HEIGHT,
	TERMINAL_ACTION_START_Y,
	TERMINAL_COMMAND_Y,
	TERMINAL_CONFIRM_CHOICE_Y,
	TERMINAL_META_ROW_HEIGHT,
	TERMINAL_META_START_Y,
	TERMINAL_TRANSITION_MS,
} from "./pixi-card-terminal-model";

describe(
	"pixi card terminal model",
	() => {
		it(
			"formats metadata lines without adding empty values",
			() => {
				expect(formatTerminalLine(
					"status",
					"ready",
				)).toBe("status: ready");
				expect(formatTerminalLine(
					"status",
					"",
				)).toBe("status");
			},
		);

		it(
			"keys terminal states by the action identity that owns the transition",
			() => {
				expect(getTerminalStateKey(null)).toBe("closed");
				expect(getTerminalStateKey({
					index:       2,
					kind:        "menu",
					startedAtMs: 100,
				})).toBe("menu:2");
				expect(getTerminalStateKey({
					actionId:    "delete",
					index:       3,
					kind:        "confirm",
					label:       "Delete",
					message:     "Really delete?",
					startedAtMs: 100,
				})).toBe("confirm:3:delete");
			},
		);

		it(
			"hides the terminal panel when no media item is bound",
			() => {
				expect(resolveTerminalPanelTransition({
					actionMenuOpen:      true,
					hasMappedItem:       false,
					nowMs:               1000,
					posterHeight:        200,
					posterY:             20,
					transitionStartedAt: 900,
				})).toMatchObject({
					isCollapsedLineOnly: false,
					isHidden:            true,
					panelHeight:         0,
					panelY:              20,
					visibleScale:        0,
				});
			},
		);

		it(
			"resolves a deterministic opening transition layout",
			() => {
				const transition = resolveTerminalPanelTransition({
					actionMenuOpen:      true,
					hasMappedItem:       true,
					nowMs:               1130,
					posterHeight:        200,
					posterY:             20,
					transitionStartedAt: 1000,
				});

				expect(transition.isHidden).toBe(false);
				expect(transition.isCollapsedLineOnly).toBe(true);
				expect(transition.progress).toBeCloseTo(0.5);
				expect(transition.visibleScale).toBeCloseTo(0.5);
				expect(transition.panelHeight).toBeCloseTo(100);
				expect(transition.panelY).toBeCloseTo(70);
			},
		);

		it(
			"treats a missing transition start as a completed open panel",
			() => {
				expect(resolveTerminalPanelTransition({
					actionMenuOpen:      true,
					hasMappedItem:       true,
					nowMs:               1000,
					posterHeight:        200,
					posterY:             20,
					transitionStartedAt: null,
				})).toMatchObject({
					isCollapsedLineOnly: false,
					isHidden:            false,
					panelHeight:         200,
					panelY:              20,
					progress:            1,
					visibleScale:        1,
				});
			},
		);

		it(
			"keeps the panel visible during close and hides it once the close transition completes",
			() => {
				const closing = resolveTerminalPanelTransition({
					actionMenuOpen:      false,
					hasMappedItem:       true,
					nowMs:               1130,
					posterHeight:        200,
					posterY:             20,
					transitionStartedAt: 1000,
				});
				const closed  = resolveTerminalPanelTransition({
					actionMenuOpen:      false,
					hasMappedItem:       true,
					nowMs:               1000 + TERMINAL_TRANSITION_MS,
					posterHeight:        200,
					posterY:             20,
					transitionStartedAt: 1000,
				});

				expect(closing.isHidden).toBe(false);
				expect(closing.visibleScale).toBeCloseTo(0.5);
				expect(closed.isHidden).toBe(true);
			},
		);

		it(
			"clamps running dots and confirm typewriter progress to sane clock bounds",
			() => {
				expect(getTerminalRunningDotCount(
					1000,
					900,
				)).toBe(1);
				expect(getTerminalRunningDotCount(
					1000,
					1000,
				)).toBe(1);
				expect(getTerminalRunningDotCount(
					1000,
					1260,
				)).toBe(2);
				expect(getTerminalRunningDotCount(
					1000,
					1520,
				)).toBe(3);
				expect(getTerminalRunningDotCount(
					1000,
					1780,
				)).toBe(1);

				expect(getTerminalConfirmVisibleChars({
					messageLength: 4,
					nowMs:         900,
					startedAtMs:   1000,
				})).toBe(0);
				expect(getTerminalConfirmVisibleChars({
					messageLength: 4,
					nowMs:         1038,
					startedAtMs:   1000,
				})).toBe(1);
				expect(getTerminalConfirmVisibleChars({
					messageLength: 4,
					nowMs:         2000,
					startedAtMs:   1000,
				})).toBe(4);
			},
		);

		it(
			"keeps action-specific keys stable while progress rendering changes over time",
			() => {
				const runningState: MediaWallTerminalState = {
					actionId:    "sync",
					index:       1,
					kind:        "running",
					label:       "Sync",
					startedAtMs: 200,
				};

				expect(getTerminalStateKey(runningState)).toBe("running:1:sync");
			},
		);

		it(
			"builds bounded menu metadata and action rows with stable terminal slots",
			() => {
				const rows = buildTerminalTextRows({
					actions:       [
						{
							id:    "open",
							label: "Open",
						},
						{
							id:      "sync",
							label:   "Sync",
							loading: true,
						},
						{
							danger: true,
							id:     "delete",
							label:  "Delete",
						},
						{
							disabled: true,
							id:       "disabled",
							label:    "Disabled",
						},
						{
							id:    "hide",
							label: "Hide",
						},
						{
							id:    "extra",
							label: "Extra",
						},
					],
					meta:          [
						{
							label: "m1",
							value: "v1",
						},
						{
							label: "m2",
							value: "v2",
						},
						{
							label: "m3",
							value: "v3",
						},
						{
							label: "m4",
							value: "v4",
						},
						{
							label: "m5",
							value: "v5",
						},
						{
							label: "m6",
							value: "v6",
						},
						{
							label: "ignored",
							value: "ignored",
						},
					],
					nowMs:         1000,
					terminalState: {
						index:       0,
						kind:        "menu",
						startedAtMs: 1000,
					},
				});

				expect(rows).toHaveLength(12);
				expect(rows[ 0 ]).toEqual({
					colorRole: "primary",
					index:     0,
					text:      "$ nimlatctl card",
					yOffset:   TERMINAL_COMMAND_Y,
				});
				expect(rows[ 1 ]).toEqual({
					colorRole: "meta",
					index:     1,
					text:      "m1: v1",
					yOffset:   TERMINAL_META_START_Y,
				});
				expect(rows[ 6 ]).toEqual({
					colorRole: "meta",
					index:     6,
					text:      "m6: v6",
					yOffset:   TERMINAL_META_START_Y + (5 * TERMINAL_META_ROW_HEIGHT),
				});
				expect(rows.slice(7)).toEqual([
					{
						colorRole: "primary",
						index:     7,
						text:      "> Open",
						yOffset:   TERMINAL_ACTION_START_Y,
					},
					{
						colorRole: "primary",
						index:     8,
						text:      "... Sync",
						yOffset:   TERMINAL_ACTION_START_Y + TERMINAL_ACTION_ROW_HEIGHT,
					},
					{
						colorRole: "danger",
						index:     9,
						text:      "> Delete",
						yOffset:   TERMINAL_ACTION_START_Y + (2 * TERMINAL_ACTION_ROW_HEIGHT),
					},
					{
						colorRole: "disabled",
						index:     10,
						text:      "> Disabled",
						yOffset:   TERMINAL_ACTION_START_Y + (3 * TERMINAL_ACTION_ROW_HEIGHT),
					},
					{
						colorRole: "primary",
						index:     11,
						text:      "> Hide",
						yOffset:   TERMINAL_ACTION_START_Y + (4 * TERMINAL_ACTION_ROW_HEIGHT),
					},
				]);
			},
		);

		it(
			"builds running and confirm rows independently from menu metadata",
			() => {
				expect(buildTerminalTextRows({
					actions:       [],
					meta:          [
						{
							label: "ignored",
							value: "ignored",
						},
					],
					nowMs:         1520,
					terminalState: {
						actionId:    "sync",
						index:       2,
						kind:        "running",
						label:       "Sync Library",
						startedAtMs: 1000,
					},
				})).toEqual([
					{
						colorRole: "primary",
						index:     0,
						text:      "$ nimlatctl card",
						yOffset:   TERMINAL_COMMAND_Y,
					},
					{
						colorRole: "amber",
						index:     1,
						text:      "running ...",
						yOffset:   TERMINAL_META_START_Y + TERMINAL_META_ROW_HEIGHT,
					},
					{
						colorRole: "meta",
						index:     2,
						text:      "exec sync library",
						yOffset:   TERMINAL_META_START_Y + 32,
					},
				]);

				expect(buildTerminalTextRows({
					actions:       [],
					meta:          [],
					nowMs:         1038,
					terminalState: {
						actionId:    "delete",
						index:       1,
						kind:        "confirm",
						label:       "Delete",
						message:     "Go",
						startedAtMs: 1000,
					},
				})).toEqual([
					{
						colorRole: "primary",
						index:     0,
						text:      "$ nimlatctl card",
						yOffset:   TERMINAL_COMMAND_Y,
					},
					{
						colorRole: "meta",
						index:     1,
						text:      "> delete",
						yOffset:   TERMINAL_META_START_Y + 8,
					},
					{
						colorRole: "amber",
						index:     2,
						text:      "> G_",
						yOffset:   TERMINAL_META_START_Y + 32,
					},
				]);

				expect(buildTerminalTextRows({
					actions:       [],
					meta:          [],
					nowMs:         1076,
					terminalState: {
						actionId:    "delete",
						index:       1,
						kind:        "confirm",
						label:       "Delete",
						message:     "Go",
						startedAtMs: 1000,
					},
				})[ 3 ]).toEqual({
					colorRole: "primary",
					index:     3,
					text:      "YES  |  NO",
					yOffset:   TERMINAL_CONFIRM_CHOICE_Y,
				});
			},
		);
	},
);
