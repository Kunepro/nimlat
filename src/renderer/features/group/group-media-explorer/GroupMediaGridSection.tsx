import { HoloScrollViewport } from "@nimlat/components";
import Button from "antd/es/button";
import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import type { FC } from "react";
import type { GroupMediaGridOverlayState } from "./group-media-explorer-model";
import styles from "./GroupMediaExplorer.module.css";
import MediaGrid, { type MediaGridProps } from "./MediaGrid";

interface GroupMediaGridSectionProps extends MediaGridProps {
	overlayState: GroupMediaGridOverlayState;
	onRetryLoad: () => void;
}

const GroupMediaGridSection: FC<GroupMediaGridSectionProps> = ({
																																 overlayState,
																																 onRetryLoad,
																																 ...gridProps
																															 }) => (
	<div className={ styles.gridShell }>
		<HoloScrollViewport
			className={ styles.gridHoloViewport }
			contentClassName={ styles.gridHoloViewportContent }
			variant="neon"
		>
			<MediaGrid
				{ ...gridProps }
				className={ styles.gridHoloScrollSurface }
			/>
		</HoloScrollViewport>
		{ overlayState.type === "loading" ? (
			<div className={ styles.stateOverlay }>
				<Spin size="large"/>
			</div>
		) : null }
		{ overlayState.type === "error" ? (
			<div className={ styles.stateOverlay }>
				<Result
					status="error"
					title="Could not load titles"
					subTitle={ overlayState.message }
					extra={ (
						<Button onClick={ onRetryLoad }>
							Try Again
						</Button>
					) }
				/>
			</div>
		) : null }
		{ overlayState.type === "empty" ? (
			<div className={ styles.stateOverlay }>
				<Empty description="This group has no titles."/>
			</div>
		) : null }
	</div>
);

export default GroupMediaGridSection;
