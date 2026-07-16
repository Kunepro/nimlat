import {
	HoloScrollViewport,
	LibraryEmptyState,
} from "@nimlat/components";
import Button from "antd/es/button";
import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import type { FC } from "react";
import styles from "./GroupsExplorer.module.css";
import type { LibraryGridOverlayState } from "./library-grid-model";
import LibraryGrid, { type LibraryGridProps } from "./LibraryGrid";

export interface LibraryGridSectionProps extends LibraryGridProps {
	overlayState: LibraryGridOverlayState;
	onDownloadAnimeDb: () => void;
	onRetryLoad: () => void;
}

const LibraryGridSection: FC<LibraryGridSectionProps> = ({
																													 overlayState,
																													 onDownloadAnimeDb,
																													 onRetryLoad,
																													 ...gridProps
																												 }) => (
	<div className={ styles.gridSection }>
		<HoloScrollViewport
			className={ styles.libraryHoloViewport }
			contentClassName={ styles.libraryHoloViewportContent }
			variant="neon"
		>
			<LibraryGrid
				{ ...gridProps }
				className={ styles.libraryHoloScrollSurface }
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
					title="Could not load library"
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
				{ overlayState.showAnimeDbDownloadPrompt
					? <LibraryEmptyState onDownloadAnimeDb={ onDownloadAnimeDb }/>
					: <Empty description={ overlayState.description }/> }
			</div>
		) : null }
	</div>
);

export default LibraryGridSection;
