// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import type { MediaWallTerminalState } from "../types/media-wall";
import {
	createMediaWallMenuTerminalState,
	resolveMediaWallTerminalActionDispatch,
	resolveTerminalMenuReturnState,
	TERMINAL_ACTION_DELAY_MS,
} from "./media-wall-terminal-actions-model";

describe(
	"media-wall terminal actions model",
	() => {
		it(
			"creates deterministic menu states from the caller clock",
			() => {
				expect(createMediaWallMenuTerminalState(
					4,
					1_234,
				)).toEqual({
					index:       4,
					kind:        "menu",
					startedAtMs: 1_234,
				});
			},
		);

		it(
			"routes destructive or prompted actions to confirm state",
			() => {
				expect(resolveMediaWallTerminalActionDispatch({
					action: {
						confirmMessage: "Really hide?",
						id:             "hide",
						label:          "Hide",
					},
					index:  3,
					nowMs:  9_000,
				})).toEqual({
					kind:          "confirm",
					terminalState: {
						actionId:    "hide",
						index:       3,
						kind:        "confirm",
						label:       "Hide",
						message:     "Really hide?",
						startedAtMs: 9_000,
					},
				});
			},
		);

		it(
			"keeps edit and refresh actions in a running state before execution",
			() => {
				expect(resolveMediaWallTerminalActionDispatch({
					action: {
						id:    "refresh",
						label: "Refresh",
					},
					index:  6,
					nowMs:  2_000,
				})).toEqual({
					delayMs:       TERMINAL_ACTION_DELAY_MS,
					kind:          "delayedRunning",
					terminalState: {
						actionId:    "refresh",
						index:       6,
						kind:        "running",
						label:       "Refresh",
						startedAtMs: 2_000,
					},
				});
			},
		);

		it(
			"executes normal actions immediately",
			() => {
				expect(resolveMediaWallTerminalActionDispatch({
					action: {
						id:    "watch",
						label: "Watch",
					},
					index:  1,
					nowMs:  3_000,
				})).toEqual({ kind: "executeImmediately" });
			},
		);

		it(
			"returns action states to menu only when the same action is still active",
			() => {
				const currentState: MediaWallTerminalState = {
					actionId:    "refresh",
					index:       2,
					kind:        "running",
					label:       "Refresh",
					startedAtMs: 100,
				};

				expect(resolveTerminalMenuReturnState({
					actionId: "refresh",
					currentState,
					index:    2,
					nowMs:    500,
				})).toEqual({
					index:       2,
					kind:        "menu",
					startedAtMs: 500,
				});
				expect(resolveTerminalMenuReturnState({
					actionId: "hide",
					currentState,
					index:    2,
					nowMs:    500,
				})).toBeNull();
				expect(resolveTerminalMenuReturnState({
					actionId: "refresh",
					currentState,
					index:    3,
					nowMs:    500,
				})).toBeNull();
			},
		);
	},
);
