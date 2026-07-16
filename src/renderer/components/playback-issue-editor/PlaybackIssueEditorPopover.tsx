import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { EpisodePlaybackIssueMoment } from "@nimlat/types/ipc-payloads";
import Form from "antd/es/form";
import Popover from "antd/es/popover";
import type { FC } from "react";
import PlaybackIssueEditorForm from "./components/PlaybackIssueEditorForm";
import PlaybackIssueEditorTriggerButton from "./components/PlaybackIssueEditorTriggerButton";
import { usePlaybackIssueEditorAutosave } from "./hooks/usePlaybackIssueEditorAutosave";
import { usePlaybackIssueEditorInitialValues } from "./hooks/usePlaybackIssueEditorInitialValues";
import {
	type PlaybackIssueButtonVariant,
	type PlaybackIssueFormValues,
	type PlaybackIssueSavePayload,
	resolvePlaybackIssueButtonPresentation,
} from "./playback-issue-editor-model";

interface PlaybackIssueEditorPopoverProps {
	currentIntegrationStatus: IntegrationStatus | null;
	supportsMoments: boolean;
	initialPlaybackIssueNote?: string;
	initialHasDubIssue?: boolean;
	initialHasSubIssue?: boolean;
	initialHasEncodingIssue?: boolean;
	initialHasAudioIssue?: boolean;
	initialHasVideoIssue?: boolean;
	initialPlaybackIssueMoments?: EpisodePlaybackIssueMoment[];
	buttonLabel?: string;
	buttonVariant?: PlaybackIssueButtonVariant;
	onSave: (payload: PlaybackIssueSavePayload) => Promise<void>;
}

// Non-modal local file issue editor used by active detail screens and episode rows.
// It autosaves through IPC so file issue tracking stays independent from metadata edit modals.
const PlaybackIssueEditorPopover: FC<PlaybackIssueEditorPopoverProps> = ({
																																					 currentIntegrationStatus,
																																					 supportsMoments,
																																					 initialPlaybackIssueNote,
																																					 initialHasDubIssue,
																																					 initialHasSubIssue,
																																					 initialHasEncodingIssue,
																																					 initialHasAudioIssue,
																																					 initialHasVideoIssue,
																																					 initialPlaybackIssueMoments,
																																					 buttonLabel = "#_! --",
																																					 buttonVariant = "default",
																																					 onSave,
																																				 }) => {
	const [ form ] = Form.useForm<PlaybackIssueFormValues>();
	const {
					hasPlaybackIssue,
					initialValues,
				}        = usePlaybackIssueEditorInitialValues({
		initialHasAudioIssue,
		initialHasDubIssue,
		initialHasEncodingIssue,
		initialHasSubIssue,
		initialHasVideoIssue,
		initialPlaybackIssueMoments,
		initialPlaybackIssueNote,
	});
	const {
					commitPendingChanges,
					isOpen,
					isSaving,
					schedulePersist,
					setIsOpen,
				}        = usePlaybackIssueEditorAutosave({
		currentIntegrationStatus,
		form,
		initialValues,
		onSave,
	});

	const {
					resolvedButtonLabel,
					shouldRenderButtonLabel,
				} = resolvePlaybackIssueButtonPresentation({
		buttonLabel,
		buttonVariant,
		hasPlaybackIssue,
	});

	return (
		<Popover
			trigger="click"
			open={ isOpen }
			onOpenChange={ setIsOpen }
			placement="bottomRight"
			content={ (
				<PlaybackIssueEditorForm
					form={ form }
					supportsMoments={ supportsMoments }
					onIssueNoteCommit={ commitPendingChanges }
					onValuesChange={ schedulePersist }
				/>
			) }
		>
			<PlaybackIssueEditorTriggerButton
				buttonVariant={ buttonVariant }
				hasPlaybackIssue={ hasPlaybackIssue }
				isSaving={ isSaving }
				resolvedButtonLabel={ resolvedButtonLabel }
				shouldRenderButtonLabel={ shouldRenderButtonLabel }
			/>
		</Popover>
	);
};

export default PlaybackIssueEditorPopover;
