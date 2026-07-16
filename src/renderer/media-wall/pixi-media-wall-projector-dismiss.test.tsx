// @vitest-environment jsdom
import {
	createElement,
	createRef,
	type ReactElement,
	useState,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import TrackingStatusRadioGroup from "../components/tracking-status-control/TrackingStatusRadioGroup";
import type { PixiMediaWallViewModel } from "../types/media-wall";
import { calculateMediaWallLayout } from "./media-wall-layout";
import { createInitialMediaWallDiagnostics } from "./pixi-media-wall-diagnostics";
import { PixiMediaWallView } from "./PixiMediaWallView";

let cleanupRenderedViews: Array<() => void> = [];

function renderView(element: ReactElement): HTMLDivElement {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);

	flushSync(() => {
		root.render(element);
	});
	cleanupRenderedViews.push(() => {
		flushSync(() => {
			root.unmount();
		});
	});

	return container;
}

interface ProjectorDismissHarnessProps {
	callOrder: string[];
}

function ProjectorDismissHarness({ callOrder }: ProjectorDismissHarnessProps) {
	const [ isProjectorOpen, setProjectorOpen ]     = useState(true);
	const layout                                    = calculateMediaWallLayout({
		viewportWidth:  800,
		viewportHeight: 600,
		itemCount:      1,
	});
	const viewModel: PixiMediaWallViewModel<string> = {
		activeAriaLabel:                    "",
		activeIndex:                        null,
		ariaLabel:                          "Test media wall",
		diagnosticsSnapshot:                createInitialMediaWallDiagnostics(),
		handleClick:                        vi.fn(),
		handleKeyDown:                      vi.fn(),
		handlePointerLeave:                 vi.fn(),
		handlePointerMove:                  vi.fn(),
		handleProjectorOverlayAction:       () => {
			callOrder.push("dismiss");
			setProjectorOpen(false);
		},
		handleProjectorOverlayPointerLeave: vi.fn(),
		handleProjectorOverlayPointerMove:  vi.fn(),
		handleScroll:                       vi.fn(),
		handleVisualScrollbarPointerDown:   vi.fn(),
		handleVisualScrollbarPointerMove:   vi.fn(),
		handleVisualScrollbarPointerUp:     vi.fn(),
		hasVerticalOverflow:                false,
		hoveredIndex:                       0,
		isDiagnosticsEnabled:               false,
		layout,
		pixiLayerRef:                       createRef<HTMLDivElement>(),
		projectorOverlayItem:               isProjectorOpen
																					? {
				height:                       layout.cardHeight,
				index:                        0,
				item:                         "media:1",
				onProjectorOverlayOpenChange: vi.fn(),
				trackingMenuOffsetPx:         -96,
				width:                        layout.cardWidth,
				x:                            0,
				y:                            0,
			}
																					: null,
		projectorOverlayStyle:              {
			display:                            "block",
			height:                             layout.cardHeight,
			transform:                          "translate(0, 0)",
			width:                              layout.cardWidth,
			"--projector-tracking-menu-offset": "-96px",
			"--projector-tracking-menu-width":  "192px",
		},
		rangeState:                         {
			items:  [ "media:1" ],
			offset: 0,
			total:  1,
		},
		renderProjectorOverlay:             () => createElement(
			TrackingStatusRadioGroup,
			{
				id:       "projector-test",
				onChange: () => {
					callOrder.push("action");
				},
				value:    null,
			},
		),
		scrollbarThumbHeight:               0,
		scrollbarThumbTop:                  0,
		scrollContainerRef:                 createRef<HTMLDivElement>(),
		scrollTop:                          0,
		size:                               {
			height: 600,
			width:  800,
		},
		spacerHeight:                       layout.totalHeight,
		visualScrollbarRef:                 createRef<HTMLDivElement>(),
		visualScrollbarThumbRef:            createRef<HTMLDivElement>(),
	};

	return createElement(
		PixiMediaWallView<string>,
		viewModel,
	);
}

describe(
	"PixiMediaWallView projector overlay",
	() => {
		afterEach(() => {
			cleanupRenderedViews.forEach(cleanupView => cleanupView());
			cleanupRenderedViews = [];
		});

		it(
			"preserves the radio change while dismissing the projector",
			() => {
				const callOrder   = new Array<string>();
				const container   = renderView(createElement(
					ProjectorDismissHarness,
					{ callOrder },
				));
				const statusInput = container.querySelector<HTMLInputElement>("input[type='radio']:not(:checked)");

				expect(statusInput).not.toBeNull();
				flushSync(() => {
					statusInput?.click();
				});

				expect(callOrder).toEqual([
					"dismiss",
					"action",
				]);
				expect(container.querySelector("[data-media-wall-projector-overlay]")).toBeNull();
			},
		);
	},
);
