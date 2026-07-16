import { TrackingStatusControl } from "@nimlat/components";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { MediaEpisodeInspectionRow } from "@nimlat/types/ipc-payloads";
import type { FC } from "react";
import styles from "../MediaEpisodesExplorer.module.css";

interface EpisodeListRowControlsProps {
	episode: MediaEpisodeInspectionRow;
	isUpdatingStatus: boolean;
	mediaId: string;
	onIntegrationStatusChange: (episodeNumber: number, nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
}

const EpisodeListRowControls: FC<EpisodeListRowControlsProps> = ({
																																	 episode,
																																	 isUpdatingStatus,
																																	 mediaId,
																																	 onIntegrationStatusChange,
																																 }) => (
	<div className={ styles.statusControl }>
		<TrackingStatusControl
			id={ `episode-${ mediaId }-${ episode.episodeNumber }` }
			value={ episode.integrationStatus ?? null }
			loading={ isUpdatingStatus }
			variant="inlineProjectorOverlay"
			onChange={ async (nextIntegrationStatus) => {
				await onIntegrationStatusChange(
					episode.episodeNumber,
					nextIntegrationStatus,
				);
			} }
		/>
	</div>
);

export default EpisodeListRowControls;
