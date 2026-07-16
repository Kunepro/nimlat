import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createTrackingStatusRadioOptions,
	INLINE_PROJECTOR_BEAM_GAP,
	INLINE_PROJECTOR_MARGIN,
	INLINE_PROJECTOR_OVERLAY_HEIGHT,
	INLINE_PROJECTOR_OVERLAY_WIDTH,
	joinTrackingStatusClassNames,
	parseTrackingStatusRadioValue,
	resolveAutoVerticalPlacement,
	resolveInlineProjectorOverlayPosition,
	resolveInlineProjectorProgress,
} from "./tracking-status-control-model";

describe(
	"tracking-status-control-model",
	() => {
		it(
			"creates tracking status radio options with stable order and checked state",
			() => {
				const options = createTrackingStatusRadioOptions({
					disabled: true,
					id:       "media-1",
					status:   "downloaded",
				});

				expect(options.map(option => option.value)).toEqual([
					"__not_tracked__",
					"tracked",
					"downloading",
					"downloaded",
					"integrated",
				]);
				expect(options.find(option => option.value === "downloaded")).toMatchObject({
					id:       "media-1-downloaded",
					checked:  true,
					disabled: true,
				});
				expect(options.find(option => option.value === "downloading")).toMatchObject({
					down: true,
				});
			},
		);

		it(
			"parses tracking status radio values",
			() => {
				expect(parseTrackingStatusRadioValue("__not_tracked__")).toBeNull();
				expect(parseTrackingStatusRadioValue("tracked")).toBe("tracked");
			},
		);

		it(
			"maps integration statuses to inline projector progress values",
			() => {
				expect(resolveInlineProjectorProgress(null)).toBe(0);
				expect(resolveInlineProjectorProgress("tracked")).toBe(25);
				expect(resolveInlineProjectorProgress("downloading")).toBe(50);
				expect(resolveInlineProjectorProgress("downloaded")).toBe(75);
				expect(resolveInlineProjectorProgress("integrated")).toBe(100);
			},
		);

		it(
			"derives vertical placement from trigger position only when geometry is available",
			() => {
				expect(resolveAutoVerticalPlacement(
					undefined,
					600,
				)).toBeUndefined();
				expect(resolveAutoVerticalPlacement(
					{ top: 100 },
					600,
				)).toBe("bottom");
				expect(resolveAutoVerticalPlacement(
					{ top: 420 },
					600,
				)).toBe("top");
			},
		);

		it(
			"positions the inline projector overlay next to the trigger and clamps it to the viewport",
			() => {
				expect(resolveInlineProjectorOverlayPosition(
					undefined,
					{
						height: 400,
						width:  500,
					},
				)).toBeNull();

				expect(resolveInlineProjectorOverlayPosition(
					{
						height: 50,
						right:  60,
						top:    140,
					},
					{
						height: 400,
						width:  500,
					},
				)).toEqual({
					left: 60 + INLINE_PROJECTOR_BEAM_GAP,
					top:  140 + 25 - INLINE_PROJECTOR_OVERLAY_HEIGHT / 2,
				});

				expect(resolveInlineProjectorOverlayPosition(
					{
						height: 40,
						right:  1_000,
						top:    1,
					},
					{
						height: 220,
						width:  300,
					},
				)).toEqual({
					left: 300 - INLINE_PROJECTOR_MARGIN - INLINE_PROJECTOR_OVERLAY_WIDTH,
					top:  INLINE_PROJECTOR_MARGIN,
				});
			},
		);

		it(
			"joins optional class names without leaking empty values",
			() => {
				expect(joinTrackingStatusClassNames(
					"base",
					false,
					undefined,
					"active",
					null,
				)).toBe("base active");
			},
		);
	},
);
