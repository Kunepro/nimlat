import type { MediaEpisodeInspectionRow } from "@nimlat/types/ipc-payloads";
import type { FC } from "react";
import styles from "../MediaEpisodesExplorer.module.css";
import { resolveEpisodeTitle } from "./episode-list-row-model";
import { useEpisodeDescriptionTruncation } from "./useEpisodeDescriptionTruncation";

interface EpisodeListRowContentProps {
	episode: MediaEpisodeInspectionRow;
	recapLabel: string;
}

const EpisodeListRowContent: FC<EpisodeListRowContentProps> = ({
																																 episode,
																																 recapLabel,
																															 }) => {
	const {
					descriptionRef,
					isTruncated,
				} = useEpisodeDescriptionTruncation(recapLabel);

	return (
		<div className={ styles.content }>
			<div className={ styles.header }>
				<div className={ styles.title }>
					{ resolveEpisodeTitle(episode) }
				</div>
			</div>
			<div className={ styles.contentBody }>
				<div
					className={ styles.descriptionShell }
					data-truncated={ isTruncated ? "true" : "false" }
				>
					<div
						ref={ descriptionRef }
						className={ styles.description }
					>
						{ recapLabel }
					</div>
				</div>
			</div>
		</div>
	);
};

export default EpisodeListRowContent;
