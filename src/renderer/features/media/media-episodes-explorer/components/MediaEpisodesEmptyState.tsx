import {
	EpisodeUpdatesStatus,
	ServerNodeIllustration,
} from "@nimlat/components";
import type { FC } from "react";
import styles from "../MediaEpisodesExplorer.module.css";

interface MediaEpisodesEmptyStateProps {
	mediaId: number;
	message: string;
	onRequestedRetry: () => void;
}

const MediaEpisodesEmptyState: FC<MediaEpisodesEmptyStateProps> = ({
																																		 mediaId,
																																		 message,
																																		 onRequestedRetry,
																																	 }) => (
	<section className={ styles.empty }>
		<EpisodeUpdatesStatus
			mediaId={ mediaId }
			onRequestedRetry={ onRequestedRetry }
		/>
		<div className={ styles.emptyState }>
			<div className={ styles.emptyIllustration }>
				<ServerNodeIllustration/>
			</div>
			<div className={ styles.emptyMessage }>
				{ message }
			</div>
		</div>
	</section>
);

export default MediaEpisodesEmptyState;
