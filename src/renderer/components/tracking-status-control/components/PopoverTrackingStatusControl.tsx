import { getIntegrationStatusLabel } from "@nimlat/constants/integration-status";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { PopoverProps } from "antd/es/popover";
import Popover from "antd/es/popover";
import Tag from "antd/es/tag";
import type {
	FC,
	ReactNode,
	RefObject,
} from "react";
import { stopTrackingStatusParentNavigation } from "../tracking-status-control-events";
import {
	joinTrackingStatusClassNames,
	type TrackingStatusControlVariant,
} from "../tracking-status-control-model";
import styles from "../TrackingStatusControl.module.css";

interface PopoverTrackingStatusControlProps {
	currentStatus: IntegrationStatus | null;
	isOpen: boolean;
	loading?: boolean;
	menu: ReactNode;
	resolvedPlacement: PopoverProps["placement"];
	trapRef: RefObject<HTMLButtonElement | null>;
	variant: TrackingStatusControlVariant;
	updateOpen: (nextOpen: boolean) => void;
}

const PopoverTrackingStatusControl: FC<PopoverTrackingStatusControlProps> = ({
																																							 currentStatus,
																																							 isOpen,
																																							 loading,
																																							 menu,
																																							 resolvedPlacement,
																																							 trapRef,
																																							 variant,
																																							 updateOpen,
																																						 }) => (
	<Popover
		trigger={ [
			"hover",
			"focus",
		] }
		open={ isOpen }
		onOpenChange={ updateOpen }
		content={ menu }
		classNames={ {
			root: joinTrackingStatusClassNames(
				styles.popover,
				variant === "projectorOverlay" && styles.projectorPopover,
			),
		} }
		placement={ resolvedPlacement ?? (variant === "projectorOverlay" ? "top" : undefined) }
		getPopupContainer={ (triggerNode) => triggerNode.parentElement ?? document.body }
		mouseEnterDelay={ 0 }
		mouseLeaveDelay={ 0.18 }
	>
		<button
			ref={ trapRef }
			type="button"
			className={ joinTrackingStatusClassNames(
				styles.trap,
				loading && styles.trapLoading,
				variant === "projectorOverlay" && styles.projectorTrap,
			) }
			aria-label="Open tracking status menu"
			onClick={ stopTrackingStatusParentNavigation }
		>
			<Tag className={ styles.tag }>
				{ getIntegrationStatusLabel(currentStatus) }
			</Tag>
		</button>
	</Popover>
);

export default PopoverTrackingStatusControl;
