import { MinusCircleOutlined } from "@ant-design/icons";
import Button from "antd/es/button";
import type {
	FormListFieldData,
	FormListOperation,
} from "antd/es/form";
import Form from "antd/es/form";
import Input from "antd/es/input";
import Select from "antd/es/select";
import type { FC } from "react";
import {
	isPlaybackIssueTimestampTextValid,
	PLAYBACK_ISSUE_CATEGORY_OPTIONS,
} from "../integration-state-section-model";
import styles from "../IntegrationStateSection.module.css";

interface IntegrationPlaybackIssueMomentRowProps {
	field: FormListFieldData;
	remove: FormListOperation["remove"];
}

const IntegrationPlaybackIssueMomentRow: FC<IntegrationPlaybackIssueMomentRowProps> = ({
																																												 field,
																																												 remove,
																																											 }) => (
	<div className={ styles.momentRow }>
		<Form.Item
			label="Issue type"
			name={ [
				field.name,
				"playbackIssueCategory",
			] }
			rules={ [
				{
					required: true,
					message:  "Choose an issue type.",
				},
			] }
		>
			<Select
				options={ [ ...PLAYBACK_ISSUE_CATEGORY_OPTIONS ] }
				placeholder="Issue type"
			/>
		</Form.Item>
		<Form.Item
			label="Timestamp"
			name={ [
				field.name,
				"timestampText",
			] }
			rules={ [
				{
					required: true,
					message:  "Enter a timestamp.",
				},
				{
					validator: async (_rule, value) => {
						if (!isPlaybackIssueTimestampTextValid(value)) {
							throw new Error("Use mm:ss or hh:mm:ss.");
						}
					},
				},
			] }
		>
			<Input placeholder="11:40"/>
		</Form.Item>
		<Form.Item
			label="Note"
			name={ [
				field.name,
				"note",
			] }
		>
			<Input
				placeholder="What to verify there"
				maxLength={ 200 }
			/>
		</Form.Item>
		<div className={ styles.momentAction }>
			<Button
				danger
				icon={ <MinusCircleOutlined/> }
				onClick={ () => remove(field.name) }
				aria-label="Remove playback issue timestamp"
			/>
		</div>
	</div>
);

export default IntegrationPlaybackIssueMomentRow;
