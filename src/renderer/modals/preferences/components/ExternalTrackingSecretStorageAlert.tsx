import type { ExternalTrackingSecretStorageStatus } from "@nimlat/types/external-tracking";
import Alert from "antd/es/alert";
import Button from "antd/es/button";
import type { FC } from "react";
import styles from "../PreferencesModal.module.css";

interface ExternalTrackingSecretStorageAlertProps {
	status: ExternalTrackingSecretStorageStatus;
	isRetrying: boolean;
	onRetry: () => void;
}

// This alert reports the actual main-process storage state. The native permission
// probe stays behind the explicit action so passive Preferences reads never open it.
const ExternalTrackingSecretStorageAlert: FC<ExternalTrackingSecretStorageAlertProps> = ({
																																													 status,
																																													 isRetrying,
																																													 onRetry,
																																												 }) => {
	const needsAction       = status.retryAvailable && status.security !== "os_encrypted";
	const retryLabel        = status.security === "access_required"
		? `Allow ${ status.backendLabel } access`
		: status.plaintextSecretsStored
			? "Protect stored credentials"
			: `Try ${ status.backendLabel } again`;
	const alertType         = status.security === "os_encrypted"
		? "success"
		: status.security === "access_required"
			? "info"
			: "warning";
	const statusClassName   = status.security === "os_encrypted"
		? styles.externalTrackingStorageSafe
		: status.security === "access_required"
			? styles.externalTrackingStorageAccess
			: styles.externalTrackingStorageWarning;
	const accessExplanation = `${ status.backendLabel } is used only to encrypt the passwords and access tokens that let Nimlat import and export watched progress. macOS may show a system permission prompt.`;
	const description       = needsAction
		? [
			status.warning,
			accessExplanation,
		].filter(Boolean).join(" ")
		: status.warning;

	return (
		<Alert
			type={ alertType }
			showIcon
			className={ `${ styles.externalTrackingStorageFooter } ${ statusClassName }` }
			message={ status.message }
			description={ description }
			action={ needsAction ? (
				<Button
					type="primary"
					size="small"
					loading={ isRetrying }
					disabled={ isRetrying }
					onClick={ onRetry }
				>
					{ retryLabel }
				</Button>
			) : null }
		/>
	);
};

export default ExternalTrackingSecretStorageAlert;
