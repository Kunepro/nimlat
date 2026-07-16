import { HeaderActionProjector } from "@nimlat/components";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	MediaHeaderPlaybackIssueSavePayload,
	MediaLayoutPlaybackIssueState,
} from "../media-layout-model";

interface MediaHeaderTrackingProjectorProps extends MediaLayoutPlaybackIssueState {
	integrationStatus?: IntegrationStatus | null;
	mediaId: string;
	onPlaybackIssueSave: (payload: MediaHeaderPlaybackIssueSavePayload) => Promise<void>;
	onTrackingStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
}

export default function MediaHeaderTrackingProjector({
																											 hasAudioIssue,
																											 hasDubIssue,
																											 hasEncodingIssue,
																											 hasSubIssue,
																											 hasVideoIssue,
																											 integrationStatus,
																											 mediaId,
																											 onPlaybackIssueSave,
																											 onTrackingStatusChange,
																											 playbackIssueMoments,
																											 playbackIssueNote,
																											 supportsMediaPlaybackIssueMoments,
																										 }: MediaHeaderTrackingProjectorProps) {
	return (
		<HeaderActionProjector
			id={ `media-header-${ mediaId }` }
			trackingStatus={ integrationStatus ?? null }
			playbackIssue={ {
				currentIntegrationStatus:    integrationStatus ?? null,
				supportsMoments:             supportsMediaPlaybackIssueMoments,
				initialPlaybackIssueNote:    playbackIssueNote,
				initialHasDubIssue:          hasDubIssue,
				initialHasSubIssue:          hasSubIssue,
				initialHasEncodingIssue:     hasEncodingIssue,
				initialHasAudioIssue:        hasAudioIssue,
				initialHasVideoIssue:        hasVideoIssue,
				initialPlaybackIssueMoments: playbackIssueMoments,
				onSave:                      onPlaybackIssueSave,
			} }
			onTrackingStatusChange={ onTrackingStatusChange }
		/>
	);
}
