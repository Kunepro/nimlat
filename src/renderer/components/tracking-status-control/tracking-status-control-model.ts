import type { IntegrationStatusControlValue } from "@nimlat/constants/integration-status";
import {
	parseIntegrationStatusControlValue,
	toIntegrationStatusControlValue,
} from "@nimlat/constants/integration-status";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { PopoverProps } from "antd/es/popover";

export type TrackingStatusControlVariant =
	| "default"
	| "projectorOverlay"
	| "inlineProjectorOverlay";

export interface InlineProjectorOverlayPosition {
	left: number;
	top: number;
}

export interface ViewportSize {
	height: number;
	width: number;
}

export interface InlineProjectorAnchorRect {
	height: number;
	right: number;
	top: number;
}

export interface VerticalPlacementAnchorRect {
	top: number;
}

export interface TrackingStatusRadioOption {
	id: string;
	value: IntegrationStatusControlValue;
	label: string;
	glitchText: string;
	number: string;
	suffixDecoration?: string;
	down?: boolean;
	checked: boolean;
	disabled?: boolean;
}

export const INLINE_PROJECTOR_OVERLAY_WIDTH  = 176;
export const INLINE_PROJECTOR_OVERLAY_HEIGHT = 230;
export const INLINE_PROJECTOR_MARGIN         = 12;
export const INLINE_PROJECTOR_BEAM_GAP       = 22;

const TRACKING_STATUS_RADIO_DEFINITIONS = [
	{
		value:      "__not_tracked__",
		label:      "Trash",
		glitchText: "_FREE_",
		number:     "R1",
	},
	{
		value:            "tracked",
		label:            "Track",
		glitchText:       "_T_RACK_",
		number:           "R2",
		suffixDecoration: "_",
	},
	{
		value:      "downloading",
		label:      "➜loading",
		glitchText: "D_L_I_N_G",
		number:     "R3",
		down:       true,
	},
	{
		value:      "downloaded",
		label:      "➜loaded",
		glitchText: "D_L_E_D",
		number:     "R4",
		down:       true,
	},
	{
		value:            "integrated",
		label:            "Merged",
		glitchText:       "_DONE_",
		number:           "R5",
		suffixDecoration: "_",
	},
] as const satisfies ReadonlyArray<{
	value: IntegrationStatusControlValue;
	label: string;
	glitchText: string;
	number: string;
	suffixDecoration?: string;
	down?: boolean;
}>;

export function createTrackingStatusRadioOptions({
																									 disabled,
																									 id,
																									 status,
																								 }: {
	disabled?: boolean;
	id: string;
	status: IntegrationStatus | null;
}): TrackingStatusRadioOption[] {
	const controlValue = toIntegrationStatusControlValue(status);

	return TRACKING_STATUS_RADIO_DEFINITIONS.map(option => ({
		id:               `${ id }-${ option.value }`,
		value:            option.value,
		label:            option.label,
		glitchText:       option.glitchText,
		number:           option.number,
		suffixDecoration: "suffixDecoration" in option ? option.suffixDecoration : undefined,
		down:             "down" in option ? option.down : undefined,
		checked:          option.value === controlValue,
		disabled,
	}));
}

export function parseTrackingStatusRadioValue(value: string): IntegrationStatus | null {
	return parseIntegrationStatusControlValue(value);
}

export function resolveInlineProjectorProgress(status: IntegrationStatus | null): number {
	switch (status) {
		case "tracked":
			return 25;
		case "downloading":
			return 50;
		case "downloaded":
			return 75;
		case "integrated":
			return 100;
		default:
			return 0;
	}
}

export function resolveAutoVerticalPlacement(
	rect: VerticalPlacementAnchorRect | undefined,
	viewportHeight: number,
): PopoverProps["placement"] | undefined {
	if (!rect) {
		return undefined;
	}

	return rect.top < viewportHeight / 2
		? "bottom"
		: "top";
}

export function resolveInlineProjectorOverlayPosition(
	rect: InlineProjectorAnchorRect | undefined,
	viewport: ViewportSize,
): InlineProjectorOverlayPosition | null {
	if (!rect) {
		return null;
	}

	const maxLeft = Math.max(
		INLINE_PROJECTOR_MARGIN,
		viewport.width - INLINE_PROJECTOR_MARGIN - INLINE_PROJECTOR_OVERLAY_WIDTH,
	);
	const maxTop  = Math.max(
		INLINE_PROJECTOR_MARGIN,
		viewport.height - INLINE_PROJECTOR_MARGIN - INLINE_PROJECTOR_OVERLAY_HEIGHT,
	);

	return {
		left: Math.min(
			Math.max(
				rect.right + INLINE_PROJECTOR_BEAM_GAP,
				INLINE_PROJECTOR_MARGIN,
			),
			maxLeft,
		),
		top:  Math.min(
			Math.max(
				rect.top + rect.height / 2 - INLINE_PROJECTOR_OVERLAY_HEIGHT / 2,
				INLINE_PROJECTOR_MARGIN,
			),
			maxTop,
		),
	};
}

export function joinTrackingStatusClassNames(...classNames: Array<string | false | null | undefined>): string {
	return classNames.filter(Boolean).join(" ");
}
