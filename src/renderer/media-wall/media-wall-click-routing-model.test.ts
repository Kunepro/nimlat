// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import type {
	MediaWallTerminalAction,
	MediaWallTerminalState,
} from "../types/media-wall";
import { resolveMediaWallClickRoute } from "./media-wall-click-routing-model";

const CARD_WIDTH  = 180;
const CARD_HEIGHT = 300;

const baseAction: MediaWallTerminalAction = {
	id:    "refresh",
	label: "Refresh",
};

function resolveRoute(overrides: Partial<Parameters<typeof resolveMediaWallClickRoute>[0]> = {}) {
	return resolveMediaWallClickRoute({
		actions:              [ baseAction ],
		canSelect:            true,
		canToggleWatchState:  true,
		hasMenuActionHandler: true,
		isActionMenuOpen:     false,
		localX:               90,
		localY:               90,
		positionHeight:       CARD_HEIGHT,
		positionWidth:        CARD_WIDTH,
		terminalState:        null,
		...overrides,
	});
}

describe(
	"media-wall click routing model",
	() => {
		it(
			"lets the action-menu button win before card body routes",
			() => {
				expect(resolveRoute({
					localX: 150,
					localY: 20,
				})).toEqual({ kind: "toggleActionMenu" });
			},
		);

		it(
			"keeps selection plaque usable while the terminal menu is open",
			() => {
				expect(resolveRoute({
					isActionMenuOpen: true,
					localX:           110,
					localY:           10,
					terminalState:    {
						kind:        "running",
						index:       4,
						actionId:    "refresh",
						label:       "Refresh",
						startedAtMs: 1,
					},
				})).toEqual({ kind: "toggleSelection" });
			},
		);

		it(
			"blocks terminal clicks while an action is running",
			() => {
				expect(resolveRoute({
					isActionMenuOpen: true,
					terminalState:    {
						kind:        "running",
						index:       4,
						actionId:    "refresh",
						label:       "Refresh",
						startedAtMs: 1,
					},
				})).toEqual({ kind: "terminalRunningBlock" });
			},
		);

		it(
			"routes terminal confirm choices to menu rollback or execution",
			() => {
				const terminalState: MediaWallTerminalState = {
					actionId:    "refresh",
					kind:        "confirm",
					index:       4,
					label:       "Refresh",
					message:     "Refresh now?",
					startedAtMs: 1,
				};

				expect(resolveRoute({
					isActionMenuOpen: true,
					localX:           25,
					localY:           117,
					terminalState,
				})).toEqual({
					kind:   "terminalConfirmYes",
					action: baseAction,
				});
				expect(resolveRoute({
					isActionMenuOpen: true,
					localX:           71,
					localY:           117,
					terminalState,
				})).toEqual({ kind: "terminalConfirmNo" });
				expect(resolveRoute({
					actions:          [],
					isActionMenuOpen: true,
					localX:           25,
					localY:           117,
					terminalState,
				})).toEqual({ kind: "none" });
			},
		);

		it(
			"routes enabled terminal menu rows only when a handler exists",
			() => {
				expect(resolveRoute({
					isActionMenuOpen: true,
					localX:           20,
					localY:           125,
				})).toEqual({
					kind:   "terminalAction",
					action: baseAction,
				});
				expect(resolveRoute({
					hasMenuActionHandler: false,
					isActionMenuOpen:     true,
					localX:               20,
					localY:               125,
				})).toEqual({ kind: "none" });
				expect(resolveRoute({
					actions:          [
						{
							...baseAction,
							disabled: true,
						},
					],
					isActionMenuOpen: true,
					localX:           20,
					localY:           125,
				})).toEqual({ kind: "none" });
			},
		);

		it(
			"routes watched plaque before default card open",
			() => {
				expect(resolveRoute({
					localX: 10,
					localY: 225,
				})).toEqual({ kind: "toggleWatchState" });
				expect(resolveRoute({
					localX: 90,
					localY: 90,
				})).toEqual({ kind: "openItem" });
			},
		);
	},
);
