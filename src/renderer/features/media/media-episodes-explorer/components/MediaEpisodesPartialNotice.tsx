import Alert from "antd/es/alert";
import type { FC } from "react";
import {
	getPartialEpisodeListDescription,
	getPartialEpisodeListMessage,
} from "../media-episodes-explorer-model";
import styles from "../MediaEpisodesExplorer.module.css";

interface MediaEpisodesPartialNoticeProps {
	expectedEpisodeCount: number;
	isEpisodeUpdateActive: boolean;
	loadedEpisodeCount: number;
}

const MediaEpisodesPartialNotice: FC<MediaEpisodesPartialNoticeProps> = ({
																																					 expectedEpisodeCount,
																																					 isEpisodeUpdateActive,
																																					 loadedEpisodeCount,
																																				 }) => (
	<Alert
		className={ styles.partialNotice }
		type="info"
		showIcon
		message={ getPartialEpisodeListMessage(
			loadedEpisodeCount,
			expectedEpisodeCount,
		) }
		description={ getPartialEpisodeListDescription(isEpisodeUpdateActive) }
	/>
);

export default MediaEpisodesPartialNotice;
