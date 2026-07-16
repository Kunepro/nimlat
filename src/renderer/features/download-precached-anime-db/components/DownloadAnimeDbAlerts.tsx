import { Alert } from "antd";
import { FC } from "react";

interface DownloadAnimeDbAlertsProps {
	progressError?: string;
	uiError: string | null;
}

const DownloadAnimeDbAlerts: FC<DownloadAnimeDbAlertsProps> = ({
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

export default DownloadAnimeDbAlerts;
