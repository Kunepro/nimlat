import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import { FC } from "react";
import MediaEpisodesEmptyState from "./components/MediaEpisodesEmptyState";
import MediaEpisodesPartialNotice from "./components/MediaEpisodesPartialNotice";
import MediaEpisodesTopBar from "./components/MediaEpisodesTopBar";
import MediaEpisodesVirtualList from "./components/MediaEpisodesVirtualList";
import { useMediaEpisodesExplorerController } from "./hooks/useMediaEpisodesExplorerController";
import { getFallbackEpisodeThumbnail } from "./media-episodes-explorer-model";
import styles from "./MediaEpisodesExplorer.module.css";

const EPISODE_PLACEHOLDER_URL = new URL(
	"../../../../assets/images/episode_thumbnail_placeholder.png",
	import.meta.url,
).href;

const MediaEpisodesExplorer: FC = () => {
	const {
					mediaId,
					mediaIdNumber,
					media,
					episodes,
					isLoading,
					errorMessage,
					isBulkUpdatingEpisodes,
					isEpisodeUpdateActive,
					emptyEpisodeMessage,
					hasPartialEpisodeList,
					selectedEpisodeNumbers,
					selectedEpisodeNumberList,
					updatingEpisodeNumberSet,
					updatingWatchedEpisodeNumberSet,
					clearEpisodeSelection,
					toggleAllEpisodesSelection,
					editEpisode,
					handleEpisodeIntegrationStatusChange,
					handleEpisodePlaybackIssueSave,
					handleEpisodeRefreshRequested,
					handleEpisodeSelectionChange,
					handleEpisodeWatchedToggle,
					handleSelectedEpisodesIntegrationStatusChange,
					handleSelectedEpisodesWatched,
					retryEpisodesLoad,
				} = useMediaEpisodesExplorerController();

	if (isLoading) {
		return (
			<section className="flex-center full-screen-v">
				<Spin size="large"/>
			</section>
		);
	}

	if (errorMessage) {
		return <Result
			status="error"
			title="Could not load episodes"
			subTitle={ errorMessage }
		/>;
	}

	if (!media) {
		return (
			<section className="flex-center full-screen-v">
				<Empty description="Media not found."/>
			</section>
		);
	}

	if (episodes.length === 0) {
		return (
			<MediaEpisodesEmptyState
				mediaId={ mediaIdNumber }
				message={ emptyEpisodeMessage }
				onRequestedRetry={ retryEpisodesLoad }
			/>
		);
	}

	const fallbackEpisodeThumbnail = getFallbackEpisodeThumbnail(
		media,
		EPISODE_PLACEHOLDER_URL,
	);

	return (
		<section className={ styles.wrapper }>
			<MediaEpisodesTopBar
				mediaId={ mediaIdNumber }
				selectedCount={ selectedEpisodeNumberList.length }
				totalCount={ episodes.length }
				isBulkUpdatingEpisodes={ isBulkUpdatingEpisodes }
				onMarkSelectedWatched={ handleSelectedEpisodesWatched }
				onSelectedStatusChange={ handleSelectedEpisodesIntegrationStatusChange }
				onClearSelection={ clearEpisodeSelection }
				onToggleSelectAll={ toggleAllEpisodesSelection }
				onRefreshRequested={ handleEpisodeRefreshRequested }
			/>
			<MediaEpisodesVirtualList
				mediaId={ mediaId }
				episodes={ episodes }
				fallbackEpisodeThumbnail={ fallbackEpisodeThumbnail }
				placeholderThumbnail={ EPISODE_PLACEHOLDER_URL }
				selectedEpisodeNumbers={ selectedEpisodeNumbers }
				updatingEpisodeNumberSet={ updatingEpisodeNumberSet }
				updatingWatchedEpisodeNumberSet={ updatingWatchedEpisodeNumberSet }
				onSelectionChange={ handleEpisodeSelectionChange }
				onIntegrationStatusChange={ handleEpisodeIntegrationStatusChange }
				onWatchedToggle={ handleEpisodeWatchedToggle }
				onEdit={ editEpisode }
				onPlaybackIssueSave={ handleEpisodePlaybackIssueSave }
			/>
			{ hasPartialEpisodeList ? (
				<MediaEpisodesPartialNotice
					loadedEpisodeCount={ episodes.length }
					expectedEpisodeCount={ media.episodesCount ?? episodes.length }
					isEpisodeUpdateActive={ isEpisodeUpdateActive }
				/>
			) : null }
		</section>
	);
};

export default MediaEpisodesExplorer;
