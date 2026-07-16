import { EditOutlined } from "@ant-design/icons";
import { PlaybackIssueEditorPopover } from "@nimlat/components";
import type { MediaEpisodeInspectionRow } from "@nimlat/types/ipc-payloads";
import Button from "antd/es/button";
import type { FC } from "react";
import styles from "../MediaEpisodesExplorer.module.css";
import type { PlaybackIssueSavePayload } from "./episode-list-row-model";
import EpisodeFillerIndicator from "./EpisodeFillerIndicator";

interface EpisodeListRowActionsProps {
	episode: MediaEpisodeInspectionRow;
	onEdit: (episode: MediaEpisodeInspectionRow) => void;
	onPlaybackIssueSave: (episode: MediaEpisodeInspectionRow, payload: PlaybackIssueSavePayload) => Promise<void>;
}

const EpisodeListRowActions: FC<EpisodeListRowActionsProps> = ({
																																 episode,
																																 onEdit,
																																 onPlaybackIssueSave,
																															 }) => (
	<div className={ styles.actions }>
		<div className={ styles.actionTop }>
			<Button
				icon={ <EditOutlined/> }
				size="small"
				type="text"
				className={ styles.editIconButton }
				aria-label="Edit episode"
				onClick={ () => onEdit(episode) }
			/>
		</div>
		<div className={ styles.actionBottom }>
			<div className={ styles.issueAndFillerStack }>
				<PlaybackIssueEditorPopover
					currentIntegrationStatus={ episode.integrationStatus ?? null }
					supportsMoments
					buttonVariant="iconOnly"
					initialPlaybackIssueNote={ episode.playbackIssueNote }
					initialHasDubIssue={ episode.hasDubIssue }
					initialHasSubIssue={ episode.hasSubIssue }
					initialHasEncodingIssue={ episode.hasEncodingIssue }
					initialHasAudioIssue={ episode.hasAudioIssue }
					initialHasVideoIssue={ episode.hasVideoIssue }
					initialPlaybackIssueMoments={ episode.playbackIssueMoments }
					onSave={ async (payload) => {
						await onPlaybackIssueSave(
							episode,
							payload,
						);
					} }
				/>
				<EpisodeFillerIndicator isFiller={ episode.filler }/>
			</div>
		</div>
	</div>
);

export default EpisodeListRowActions;
