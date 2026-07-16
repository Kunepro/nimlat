import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { PopoverProps } from "antd/es/popover";
import type { FC } from "react";
import {
	memo,
	useCallback,
} from "react";
import InlineProjectorTrackingStatusControl from "./components/InlineProjectorTrackingStatusControl";
import PopoverTrackingStatusControl from "./components/PopoverTrackingStatusControl";
import TrackingStatusMenu from "./components/TrackingStatusMenu";
import { useTrackingStatusPopoverState } from "./hooks/useTrackingStatusPopoverState";
import { type TrackingStatusControlVariant } from "./tracking-status-control-model";

interface TrackingStatusControlProps {
	id: string;
	value?: IntegrationStatus | null;
	loading?: boolean;
	placement?: PopoverProps["placement"];
	variant?: TrackingStatusControlVariant;
	autoVerticalPlacement?: boolean;
	onOpenChange?: (open: boolean) => void;
	onChange: (value: IntegrationStatus | null) => void | Promise<void>;
}

// Ignore is intentionally excluded from this tracking control; it is an item visibility action.
const TrackingStatusControl: FC<TrackingStatusControlProps> = ({
																																 id,
																																 value,
																																 loading,
																																 placement,
																																 variant = "default",
																																 autoVerticalPlacement = false,
																																 onOpenChange,
																																 onChange,
																															 }) => {
	const currentStatus = value ?? null;
	const {
					closeInlineProjectorSoon,
					inlineOverlayPosition,
					isOpen,
					resolvedPlacement,
					trapRef,
					updateOpen,
				}             = useTrackingStatusPopoverState({
		autoVerticalPlacement,
		onOpenChange,
		placement,
		variant,
	});

	const handleStatusChange = useCallback(
		(nextStatus: IntegrationStatus | null) => {
			updateOpen(false);
			void onChange(nextStatus);
		},
		[
			onChange,
			updateOpen,
		],
	);

	const menu = (
		<TrackingStatusMenu
			id={ id }
			value={ currentStatus }
			loading={ loading }
			onChange={ handleStatusChange }
		/>
	);

	if (variant === "inlineProjectorOverlay") {
		return (
			<InlineProjectorTrackingStatusControl
				currentStatus={ currentStatus }
				inlineOverlayPosition={ inlineOverlayPosition }
				isOpen={ isOpen }
				loading={ loading }
				menu={ menu }
				trapRef={ trapRef }
				closeInlineProjectorSoon={ closeInlineProjectorSoon }
				updateOpen={ updateOpen }
			/>
		);
	}

	return (
		<PopoverTrackingStatusControl
			currentStatus={ currentStatus }
			isOpen={ isOpen }
			loading={ loading }
			menu={ menu }
			resolvedPlacement={ resolvedPlacement }
			trapRef={ trapRef }
			variant={ variant }
			updateOpen={ updateOpen }
		/>
	);
};

export default memo(TrackingStatusControl);
