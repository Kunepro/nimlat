import { Alert } from "antd";
import { FC } from "react";

interface PopulationAlertsProps {
	progressError?: string;
	uiError: string | null;
}

const PopulationAlerts: FC<PopulationAlertsProps> = ({
																											 progressError,
																											 uiError,
																										 }) => (
	<>
		{ progressError ? (
			<Alert
				type="error"
				showIcon
				message={ progressError }
			/>
		) : null }
		{ uiError ? (
			<Alert
				type="error"
				showIcon
				message={ uiError }
			/>
		) : null }
	</>
);

export default PopulationAlerts;
