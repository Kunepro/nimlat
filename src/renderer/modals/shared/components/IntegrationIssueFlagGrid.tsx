import Checkbox from "antd/es/checkbox";
import Form from "antd/es/form";
import type { FC } from "react";
import { PLAYBACK_ISSUE_FLAG_FIELDS } from "../integration-state-section-model";
import styles from "../IntegrationStateSection.module.css";

const IntegrationIssueFlagGrid: FC = () => (
	<div className={ styles.issueGrid }>
		{ PLAYBACK_ISSUE_FLAG_FIELDS.map(field => (
			<Form.Item
				key={ field.name }
				name={ field.name }
				valuePropName="checked"
			>
				<Checkbox>{ field.label }</Checkbox>
			</Form.Item>
		)) }
	</div>
);

export default IntegrationIssueFlagGrid;
