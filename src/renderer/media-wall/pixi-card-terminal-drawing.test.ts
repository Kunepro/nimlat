// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type {
	MediaWallItem,
	MediaWallItemViewportPosition,
	MediaWallTerminalState,
} from "../types/media-wall";

const modelMocks = vi.hoisted(() => ({
	buildTerminalTextRows:          vi.fn(() => [
		{
			colorRole: "primary",
			index:     0,
			text:      "row from explicit clock",
			yOffset:   18,
		},
	]),
	getActionButtonBounds:          vi.fn(() => ({
		size: 12,
		x:    96,
		y:    220,
	})),
	getPosterBounds:                vi.fn(() => ({
		height: 120,
		width:  90,
		x:      15,
		y:      18,
	})),
	resolveTerminalPanelTransition: vi.fn(() => ({
		isCollapsedLineOnly: false,
		isHidden:            false,
		panelHeight:         72,
		panelY:              42,
		progress:            0.5,
		visibleScale:        0.5,
	})),
}));

vi.mock(
	"./pixi-card-geometry",
	() => ({
		getActionButtonBounds: modelMocks.getActionButtonBounds,
		getPosterBounds:       modelMocks.getPosterBounds,
	}),
);

vi.mock(
	"./pixi-card-terminal-model",
	() => ({
		buildTerminalTextRows:          modelMocks.buildTerminalTextRows,
		resolveTerminalPanelTransition: modelMocks.resolveTerminalPanelTransition,
		TERMINAL_TEXT_LINE_COUNT:       13,
	}),
);

const {
				drawActionTerminal,
				TERMINAL_GREEN_COLOR,
			} = await import("./pixi-card-terminal-drawing");

const POSITION: MediaWallItemViewportPosition = {
	column:  0,
	columns: 1,
	height:  252,
	index:   0,
	row:     0,
	width:   120,
	x:       0,
	y:       0,
};

const MAPPED: MediaWallItem = {
	id:    "media:1",
	kind:  "library",
	title: "Example",
};

const TERMINAL_STATE: MediaWallTerminalState = {
	index:       0,
	kind:        "menu",
	startedAtMs: 2_000,
};

interface FakeGraphics {
	visible: boolean;
	clear: ReturnType<typeof vi.fn>;
	roundRect: ReturnType<typeof vi.fn>;
	fill: ReturnType<typeof vi.fn>;
	stroke: ReturnType<typeof vi.fn>;
	circle: ReturnType<typeof vi.fn>;
	moveTo: ReturnType<typeof vi.fn>;
	lineTo: ReturnType<typeof vi.fn>;
}

interface FakeTerminalText {
	text: string;
	style: {
		fill: number;
	};
	position: {
		set: ReturnType<typeof vi.fn>;
	};
	visible: boolean;
}

function createFakeGraphics(): FakeGraphics {
	const graphics = {
		circle:    vi.fn(),
		clear:     vi.fn(),
		fill:      vi.fn(),
		lineTo:    vi.fn(),
		moveTo:    vi.fn(),
		roundRect: vi.fn(),
		stroke:    vi.fn(),
		visible:   false,
	} as FakeGraphics;
	graphics.circle.mockReturnValue(graphics);
	graphics.clear.mockReturnValue(graphics);
	graphics.fill.mockReturnValue(graphics);
	graphics.lineTo.mockReturnValue(graphics);
	graphics.moveTo.mockReturnValue(graphics);
	graphics.roundRect.mockReturnValue(graphics);
	graphics.stroke.mockReturnValue(graphics);
	return graphics;
}

function createTerminalText(): FakeTerminalText {
	return {
		position: {
			set: vi.fn(),
		},
		style:    {
			fill: 0,
		},
		text:     "",
		visible:  false,
	};
}

describe(
	"pixi card terminal drawing",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it(
			"uses the explicit render timestamp for transition and terminal rows",
			() => {
				const actionButton  = createFakeGraphics();
				const terminalPanel = createFakeGraphics();
				const terminalTexts = [
					createTerminalText(),
					createTerminalText(),
				];

				drawActionTerminal({
					actionButton:        actionButton as never,
					mapped:              MAPPED,
					nowMs:               2_222,
					position:            POSITION,
					terminalPanel:       terminalPanel as never,
					terminalState:       TERMINAL_STATE,
					terminalTexts:       terminalTexts as never,
					transitionStartedAt: 2_000,
				});

				expect(modelMocks.resolveTerminalPanelTransition).toHaveBeenCalledWith({
					actionMenuOpen:      true,
					hasMappedItem:       true,
					nowMs:               2_222,
					posterHeight:        120,
					posterY:             18,
					transitionStartedAt: 2_000,
				});
				expect(modelMocks.buildTerminalTextRows).toHaveBeenCalledWith({
					actions:       [],
					meta:          [],
					nowMs:         2_222,
					terminalState: TERMINAL_STATE,
				});
				expect(terminalTexts[ 0 ]).toMatchObject({
					text:    "row from explicit clock",
					visible: true,
				});
				expect(terminalTexts[ 0 ]?.style.fill).toBe(TERMINAL_GREEN_COLOR);
				expect(terminalTexts[ 0 ]?.position.set).toHaveBeenCalledWith(
					27,
					36,
				);
			},
		);
	},
);
