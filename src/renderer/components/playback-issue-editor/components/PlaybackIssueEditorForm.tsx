import type { FormInstance } from "antd/es/form";
import Form from "antd/es/form";
import type { FC } from "react";
import IntegrationStateSection from "../../../modals/shared/IntegrationStateSection";
import type { PlaybackIssueFormValues } from "../playback-issue-editor-model";
import styles from "../PlaybackIssueEditorPopover.module.css";

interface PlaybackIssueEditorFormProps {
	form: FormInstance<PlaybackIssueFormValues>;
	supportsMoments: boolean;
	onIssueNoteCommit: () => void;
	onValuesChange: (changedValues: Partial<PlaybackIssueFormValues>) => void;
}

const PlaybackIssueEditorForm: FC<PlaybackIssueEditorFormProps> = ({
																																		 form,
																											 supportsMoments,
																											 onIssueNoteCommit,
																											 onValuesChange,
																																	 }) => (
	<div className={ styles.content }>
		<Form
			form={ form }
			layout="vertical"
			onValuesChange={ onValuesChange }
		>
			<IntegrationStateSection
				supportsMoments={ supportsMoments }
				showStatus={ false }
				onIssueNoteBlur={ onIssueNoteCommit }
				onIssueNoteClear={ () => {
					onValuesChange({ playbackIssueNote: "" });
					onIssueNoteCommit();
				} }
			/>
		</Form>
	</div>
);

export default PlaybackIssueEditorForm;
