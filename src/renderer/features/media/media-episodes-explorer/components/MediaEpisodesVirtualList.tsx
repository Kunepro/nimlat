import { HoloScrollViewport } from "@nimlat/components";
import type { MediaEpisodeInspectionRow } from "@nimlat/types/ipc-payloads";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	type FC,
	useRef,
} from "react";
import { resolveImageSrc } from "../../../../utils/resolve-image-src";
import { formatEpisodeRecap } from "../episode-list-formatters";
import {
	EPISODE_ROW_GAP,
	EPISODE_ROW_HEIGHT,
	getEpisodeThumbnailSource,
} from "../media-episodes-explorer-model";
import styles from "../MediaEpisodesExplorer.module.css";
import type { EpisodeListRowProps } from "./episode-list-row-model";
import EpisodeListRow from "./EpisodeListRow";

// The terminal chassis visually occludes the scroll edges, so rows need a small parking bay before the first item.
const EPISODE_HOLO_TERMINAL_INSET = 20;

interface MediaEpisodesVirtualListProps {
	episodes: MediaEpisodeInspectionRow[];
	fallbackEpisodeThumbnail: string;
	mediaId: string;
	placeholderThumbnail: string;
	selectedEpisodeNumbers: ReadonlySet<number>;
	updatingEpisodeNumberSet: ReadonlySet<number>;
	updatingWatchedEpisodeNumberSet: ReadonlySet<number>;
	onEdit: EpisodeListRowProps["onEdit"];
	onIntegrationStatusChange: EpisodeListRowProps["onIntegrationStatusChange"];
	onPlaybackIssueSave: EpisodeListRowProps["onPlaybackIssueSave"];
	onSelectionChange: EpisodeListRowProps["onSelectionChange"];
	onWatchedToggle: EpisodeListRowProps["onWatchedToggle"];
}

const MediaEpisodesVirtualList: FC<MediaEpisodesVirtualListProps> = ({
																																			 episodes,
																																			 fallbackEpisodeThumbnail,
																																			 mediaId,
																																			 placeholderThumbnail,
																																			 selectedEpisodeNumbers,
																																			 updatingEpisodeNumberSet,
																																			 updatingWatchedEpisodeNumberSet,
																																			 onEdit,
																																			 onIntegrationStatusChange,
																																			 onPlaybackIssueSave,
																																			 onSelectionChange,
																																			 onWatchedToggle,
																																		 }) => {
	const parentRef   = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count:            episodes.length,
		getScrollElement: () => parentRef.current,
		estimateSize:     () => EPISODE_ROW_HEIGHT,
		overscan:         2,
	});

	return (
		<HoloScrollViewport
			className={ styles.holoViewport }
			contentClassName={ styles.holoViewportContent }
		>
			<div
				ref={ parentRef }
				className={ styles.scroller }
			>
				<div
					className={ styles.canvas }
					style={ { height: virtualizer.getTotalSize() + (EPISODE_HOLO_TERMINAL_INSET * 2) } }
				>
					{ virtualizer.getVirtualItems().map((virtualRow) => {
						const episode          = episodes[ virtualRow.index ];
						const episodeThumbnail = resolveImageSrc(getEpisodeThumbnailSource(
							episode,
							fallbackEpisodeThumbnail,
						)) || placeholderThumbnail;
						return (
							<EpisodeListRow
								key={ virtualRow.key }
								mediaId={ mediaId }
								episode={ episode }
								episodeThumbnail={ episodeThumbnail }
								placeholderThumbnail={ placeholderThumbnail }
								recapLabel={ formatEpisodeRecap(episode.description || episode.recap) }
								virtualStart={ virtualRow.start + EPISODE_HOLO_TERMINAL_INSET }
								rowHeight={ EPISODE_ROW_HEIGHT - EPISODE_ROW_GAP }
								isSelected={ selectedEpisodeNumbers.has(episode.episodeNumber) }
								isUpdatingStatus={ updatingEpisodeNumberSet.has(episode.episodeNumber) }
								isUpdatingWatched={ updatingWatchedEpisodeNumberSet.has(episode.episodeNumber) }
								onSelectionChange={ onSelectionChange }
								onIntegrationStatusChange={ onIntegrationStatusChange }
								onWatchedToggle={ onWatchedToggle }
								onEdit={ onEdit }
								onPlaybackIssueSave={ onPlaybackIssueSave }
							/>
						);
					}) }
				</div>
			</div>
		</HoloScrollViewport>
	);
};

export default MediaEpisodesVirtualList;
