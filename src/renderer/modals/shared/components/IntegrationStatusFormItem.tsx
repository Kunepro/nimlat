import Form from "antd/es/form";
import Select from "antd/es/select";
import type { FC } from "react";
import { INTEGRATION_STATUS_OPTIONS } from "../integration-status-options";

const IntegrationStatusFormItem: FC = () => (
	<Form.Item
		label="Tracking status"
		name="integrationStatus"
		rules={ [
			{
				required: true,
				message:  "Please select the current tracking status.",
			},
		] }
	>
		<Select options={ [ ...INTEGRATION_STATUS_OPTIONS ] }/>
	</Form.Item>
);

export default IntegrationStatusFormItem;
