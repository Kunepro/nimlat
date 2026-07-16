import type { CheckboxChangeEvent } from "antd/es/checkbox";
import Checkbox from "antd/es/checkbox";
import {
	type FC,
	memo,
} from "react";
import styles from "../MediaEpisodesExplorer.module.css";
import {
	areEpisodeListRowPropsEqual,
	createEpisodeListRowStyle,
	type EpisodeListRowProps,
} from "./episode-list-row-model";
import EpisodeListRowActions from "./EpisodeListRowActions";
import EpisodeListRowContent from "./EpisodeListRowContent";
import EpisodeListRowControls from "./EpisodeListRowControls";
import EpisodeListRowThumbnail from "./EpisodeListRowThumbnail";
import EpisodeMetadataRail from "./EpisodeMetadataRail";

const EpisodeListRow: FC<EpisodeListRowProps> = ({
																									 mediaId,
																									 episode,
																									 episodeThumbnail,
																									 placeholderThumbnail,
																									 recapLabel,
																									 virtualStart,
																									 rowHeight,
																									 isSelected,
																									 isUpdatingStatus,
																									 isUpdatingWatched,
																									 onSelectionChange,
																									 onIntegrationStatusChange,
																									 onWatchedToggle,
																									 onEdit,
																									 onPlaybackIssueSave,
																								 }) => {
	const onCheckboxChange = (event: CheckboxChangeEvent) => {
		onSelectionChange(
			episode.episodeNumber,
			event.target.checked,
			(event.nativeEvent as MouseEvent).shiftKey,
		);
	};

	return (
		<div
			className={ styles.row }
			style={ createEpisodeListRowStyle(
				virtualStart,
				rowHeight,
			) }
		>
			<div className={ styles.selectionCell }>
				<Checkbox
					checked={ isSelected }
					aria-label={ `Select episode ${ episode.episodeNumber }` }
					onChange={ onCheckboxChange }
				/>
			</div>
			<EpisodeListRowThumbnail
				episode={ episode }
				episodeThumbnail={ episodeThumbnail }
				placeholderThumbnail={ placeholderThumbnail }
				isUpdatingWatched={ isUpdatingWatched }
				onWatchedToggle={ onWatchedToggle }
			/>
			<EpisodeListRowControls
				episode={ episode }
				isUpdatingStatus={ isUpdatingStatus }
				mediaId={ mediaId }
				onIntegrationStatusChange={ onIntegrationStatusChange }
			/>
			<EpisodeListRowContent
				episode={ episode }
				recapLabel={ recapLabel }
			/>
			<EpisodeMetadataRail episode={ episode }/>
			<EpisodeListRowActions
				episode={ episode }
				onEdit={ onEdit }
				onPlaybackIssueSave={ onPlaybackIssueSave }
			/>
		</div>
	);
};

export default memo(
	EpisodeListRow,
	areEpisodeListRowPropsEqual,
);
