import Button from "antd/es/button";
import Form from "antd/es/form";
import Input from "antd/es/input";
import type { FC } from "react";
import styles from "../IntegrationStateSection.module.css";

interface IntegrationIssueNoteFieldProps {
	onBlur?: () => void;
	onClear?: () => void;
}

const IntegrationIssueNoteField: FC<IntegrationIssueNoteFieldProps> = ({
																																																 onBlur,
																																																 onClear,
																																															 }) => {
	const form = Form.useFormInstance();

	return (
		<>
			<Form.Item
				label="Issue note"
				name="playbackIssueNote"
			>
				<Input.TextArea
					rows={ 3 }
					maxLength={ 600 }
					onBlur={ (event) => {
						const nextTarget = event.relatedTarget;
						if (nextTarget instanceof HTMLElement && nextTarget.dataset.issueNoteClear === "true") {
							return;
						}
						onBlur?.();
					} }
				/>
			</Form.Item>
			<div className={ styles.noteActions }>
				<Button
					data-issue-note-clear="true"
					onClick={ () => {
						form.setFieldValue(
							"playbackIssueNote",
							"",
						);
						onClear?.();
					} }
				>
					Clear note
				</Button>
			</div>
		</>
	);
};

export default IntegrationIssueNoteField;
