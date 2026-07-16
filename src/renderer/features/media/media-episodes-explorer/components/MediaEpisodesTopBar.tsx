import {
	BorderOutlined,
	CheckSquareOutlined,
	MinusSquareOutlined,
} from "@ant-design/icons";
import { EpisodeUpdatesStatus } from "@nimlat/components";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import Button from "antd/es/button";
import type {
	FC,
	ReactNode,
} from "react";
import {
	type EpisodeBulkSelectionState,
	getEpisodeBulkSelectionState,
} from "../media-episodes-explorer-model";
import styles from "../MediaEpisodesExplorer.module.css";
import EpisodeSelectionToolbar from "./EpisodeSelectionToolbar";

interface MediaEpisodesTopBarProps {
	isBulkUpdatingEpisodes: boolean;
	mediaId: number;
	selectedCount: number;
	totalCount: number;
	onClearSelection: () => void;
	onMarkSelectedWatched: () => void | Promise<void>;
	onRefreshRequested: () => void;
	onToggleSelectAll: () => void;
	onSelectedStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => void | Promise<void>;
}

function getSelectAllIcon(selectionState: EpisodeBulkSelectionState): ReactNode {
	if (selectionState === "all") {
		return <CheckSquareOutlined/>;
	}

	return selectionState === "partial"
		? <MinusSquareOutlined/>
		: <BorderOutlined/>;
}

function getSelectAllAriaLabel(selectionState: EpisodeBulkSelectionState): string {
	if (selectionState === "all") {
		return "Deselect all episodes";
	}

	return selectionState === "partial"
		? "Select all episodes, some currently selected"
		: "Select all episodes";
}

const MediaEpisodesTopBar: FC<MediaEpisodesTopBarProps> = ({
																														 isBulkUpdatingEpisodes,
																														 mediaId,
																														 selectedCount,
																														 totalCount,
																														 onClearSelection,
																														 onMarkSelectedWatched,
																														 onRefreshRequested,
																														 onToggleSelectAll,
																														 onSelectedStatusChange,
																													 }) => {
	const selectionState = getEpisodeBulkSelectionState(
		selectedCount,
		totalCount,
	);
	const ariaLabel      = getSelectAllAriaLabel(selectionState);

	return (
		<div className={ styles.topBar }>
			<div className={ styles.episodeActionButtons }>
				<EpisodeUpdatesStatus
					mediaId={ mediaId }
					mode="inline-action"
					onRequestedRetry={ onRefreshRequested }
				/>
				<Button
					className={ styles.selectAllButton }
					data-selection-state={ selectionState }
					icon={ getSelectAllIcon(selectionState) }
					size="small"
					aria-label={ ariaLabel }
					aria-pressed={ selectionState === "partial" ? "mixed" : selectionState === "all" }
					title={ ariaLabel }
					disabled={ isBulkUpdatingEpisodes || totalCount === 0 }
					onClick={ onToggleSelectAll }
				>
					Select all
				</Button>
			</div>
			<EpisodeSelectionToolbar
				selectedCount={ selectedCount }
				totalCount={ totalCount }
				disabled={ isBulkUpdatingEpisodes }
				onMarkWatched={ onMarkSelectedWatched }
				onStatusChange={ onSelectedStatusChange }
				onClearSelection={ onClearSelection }
			/>
		</div>
	);
};

export default MediaEpisodesTopBar;
