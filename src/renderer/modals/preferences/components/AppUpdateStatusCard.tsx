import type { AppUpdateStatus } from "@nimlat/types/app-update";
import {
	Alert,
	Button,
	Progress,
	Space,
} from "antd";
import type { FC } from "react";
import { getStatusAlertType } from "../app-update-preferences-model";
import styles from "../PreferencesModal.module.css";

interface AppUpdateStatusCardProps {
	canUpdateApp: boolean;
	currentVersion: string;
	isActionRunning: boolean;
	isChecking: boolean;
	isDownloading: boolean;
	latestPublishedAppVersion: string;
	status: AppUpdateStatus | null;
	statusMessage: string;
	updateAppLabel: string;
	onCheckForUpdates: () => void;
	onUpdateApp: () => void;
}

const AppUpdateStatusCard: FC<AppUpdateStatusCardProps> = ({
																														 canUpdateApp,
																														 currentVersion,
																														 isActionRunning,
																														 isChecking,
																														 isDownloading,
																														 latestPublishedAppVersion,
																														 status,
																														 statusMessage,
																														 updateAppLabel,
																														 onCheckForUpdates,
																														 onUpdateApp,
																													 }) => (
	<div className={ styles.appUpdateCard }>
		<div className={ styles.settingLabel }>App</div>
		<div className={ styles.appVersionGrid }>
			<div>
				<div className={ styles.appVersionLabel }>Current version</div>
				<div className={ styles.appVersionValue }>{ currentVersion }</div>
			</div>
			<div>
				<div className={ styles.appVersionLabel }>Latest published version</div>
				<div className={ styles.appVersionValue }>{ latestPublishedAppVersion }</div>
			</div>
		</div>

		<Alert
			type={ status ? getStatusAlertType(status) : "info" }
			message={ statusMessage }
			showIcon
		/>

		{ isDownloading && status?.state === "downloading" ? (
			<Progress
				percent={ Math.round(status.percent) }
				status="active"
			/>
		) : null }

		<Space wrap>
			<Button
				type="primary"
				loading={ isChecking && status?.state !== "downloading" }
				disabled={ status?.state === "not-supported" || isDownloading }
				onClick={ onCheckForUpdates }
			>
				Check for updates
			</Button>
			<Button
				disabled={ !canUpdateApp || isActionRunning }
				loading={ isDownloading }
				onClick={ onUpdateApp }
			>
				{ updateAppLabel }
			</Button>
		</Space>
	</div>
);

export default AppUpdateStatusCard;
