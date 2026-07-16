import { getIntegrationStatusLabel } from "@nimlat/constants/integration-status";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	CSSProperties,
	FC,
	ReactNode,
	RefObject,
} from "react";
import { createPortal } from "react-dom";
import { stopTrackingStatusParentNavigation } from "../tracking-status-control-events";
import {
	type InlineProjectorOverlayPosition,
	joinTrackingStatusClassNames,
	resolveInlineProjectorProgress,
} from "../tracking-status-control-model";
import styles from "../TrackingStatusControl.module.css";

interface InlineProjectorTrackingStatusControlProps {
	currentStatus: IntegrationStatus | null;
	inlineOverlayPosition: InlineProjectorOverlayPosition | null;
	isOpen: boolean;
	loading?: boolean;
	menu: ReactNode;
	trapRef: RefObject<HTMLButtonElement | null>;
	closeInlineProjectorSoon: () => void;
	updateOpen: (nextOpen: boolean) => void;
}

const InlineProjectorTrackingStatusControl: FC<InlineProjectorTrackingStatusControlProps> = ({
																																															 currentStatus,
																																															 inlineOverlayPosition,
																																															 isOpen,
																																															 loading,
																																															 menu,
																																															 trapRef,
																																															 closeInlineProjectorSoon,
																																															 updateOpen,
																																														 }) => {
	const progress = resolveInlineProjectorProgress(currentStatus);

	return (
		<>
			<div
				className={ joinTrackingStatusClassNames(
					styles.inlineProjectorCluster,
					currentStatus === "integrated" && styles.inlineProjectorClusterIntegrated,
				) }
				style={ { "--tracking-progress": `${ progress }%` } as CSSProperties }
				onMouseEnter={ () => updateOpen(true) }
				onMouseLeave={ closeInlineProjectorSoon }
				onClick={ stopTrackingStatusParentNavigation }
			>
				<span
					className={ styles.inlineProjectorMeter }
					aria-hidden
				>
					<span className={ styles.inlineProjectorMeterFill }/>
				</span>
				<button
					ref={ trapRef }
					type="button"
					className={ joinTrackingStatusClassNames(
						styles.inlineProjectorDevice,
						loading && styles.trapLoading,
						isOpen && styles.inlineProjectorDeviceActive,
						currentStatus === "integrated" && styles.inlineProjectorDeviceIntegrated,
					) }
					aria-label={ `Tracking status: ${ getIntegrationStatusLabel(currentStatus) }` }
					onFocus={ () => updateOpen(true) }
					onBlur={ closeInlineProjectorSoon }
				>
					<span
						className={ styles.inlineProjectorLens }
						aria-hidden
					/>
				</button>
			</div>
			{ isOpen && inlineOverlayPosition
				? createPortal(
					<div
						className={ styles.inlineProjectorOverlay }
						style={ {
							left: `${ inlineOverlayPosition.left }px`,
							top:  `${ inlineOverlayPosition.top }px`,
						} }
						onMouseEnter={ () => updateOpen(true) }
						onMouseLeave={ closeInlineProjectorSoon }
						onClick={ stopTrackingStatusParentNavigation }
					>
						{ menu }
					</div>,
					document.body,
				)
				: null }
		</>
	);
};

export default InlineProjectorTrackingStatusControl;
