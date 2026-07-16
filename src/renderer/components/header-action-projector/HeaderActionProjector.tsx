import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { EpisodePlaybackIssueMoment } from "@nimlat/types/ipc-payloads";
import type { FC } from "react";
import PlaybackIssueEditorPopover from "../playback-issue-editor/PlaybackIssueEditorPopover";
import TrackingStatusRadioGroup from "../tracking-status-control/TrackingStatusRadioGroup";
import styles from "./HeaderActionProjector.module.css";

interface PlaybackIssueConfig {
	currentIntegrationStatus: IntegrationStatus | null;
	supportsMoments: boolean;
	initialPlaybackIssueNote?: string;
	initialHasDubIssue?: boolean;
	initialHasSubIssue?: boolean;
	initialHasEncodingIssue?: boolean;
	initialHasAudioIssue?: boolean;
	initialHasVideoIssue?: boolean;
	initialPlaybackIssueMoments?: EpisodePlaybackIssueMoment[];
	onSave: (payload: {
		integrationStatus: IntegrationStatus | null;
		playbackIssueNote?: string;
		hasDubIssue?: boolean;
		hasSubIssue?: boolean;
		hasEncodingIssue?: boolean;
		hasAudioIssue?: boolean;
		hasVideoIssue?: boolean;
		playbackIssueMoments: EpisodePlaybackIssueMoment[];
	}) => Promise<void>;
}

interface HeaderActionProjectorProps {
	id: string;
	trackingStatus?: IntegrationStatus | null;
	isTrackingDisabled?: boolean;
	playbackIssue?: PlaybackIssueConfig;
	onTrackingStatusChange: (value: IntegrationStatus | null) => void | Promise<void>;
}

const HeaderActionProjector: FC<HeaderActionProjectorProps> = ({
																																 id,
																																 trackingStatus,
																																 isTrackingDisabled,
																																 playbackIssue,
																																 onTrackingStatusChange,
																															 }) => (
	<div
		className={ styles.projectorConsole }
		aria-label={ playbackIssue ? "Media tracking and file issue controls" : "Group tracking controls" }
	>
		<div className={ styles.projectorDevice }>
			<span className={ styles.deviceBody }>
				<span className={ styles.deviceRidge }/>
				<span className={ styles.deviceLens }/>
				{ playbackIssue ? (
					<span className={ styles.deviceIssueButton }>
						<PlaybackIssueEditorPopover
							currentIntegrationStatus={ playbackIssue.currentIntegrationStatus }
							supportsMoments={ playbackIssue.supportsMoments }
							initialPlaybackIssueNote={ playbackIssue.initialPlaybackIssueNote }
							initialHasDubIssue={ playbackIssue.initialHasDubIssue }
							initialHasSubIssue={ playbackIssue.initialHasSubIssue }
							initialHasEncodingIssue={ playbackIssue.initialHasEncodingIssue }
							initialHasAudioIssue={ playbackIssue.initialHasAudioIssue }
							initialHasVideoIssue={ playbackIssue.initialHasVideoIssue }
							initialPlaybackIssueMoments={ playbackIssue.initialPlaybackIssueMoments }
							buttonVariant="iconOnly"
							onSave={ playbackIssue.onSave }
						/>
					</span>
				) : null }
			</span>
			<span className={ styles.laserBeam }/>
		</div>
		<div className={ styles.controlsDeck }>
			<div className={ styles.trackingButtons }>
				<TrackingStatusRadioGroup
					id={ id }
					value={ trackingStatus ?? null }
					disabled={ isTrackingDisabled }
					onChange={ onTrackingStatusChange }
				/>
			</div>
		</div>
	</div>
);

export default HeaderActionProjector;
