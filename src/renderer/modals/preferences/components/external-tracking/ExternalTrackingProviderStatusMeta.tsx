import type { ExternalTrackingAccount } from "@nimlat/types/external-tracking";
import Alert from "antd/es/alert";
import type { FC } from "react";
import { formatExternalTrackingTimestamp } from "../../external-tracking-preferences-model";
import styles from "../../PreferencesModal.module.css";

interface ExternalTrackingProviderStatusMetaProps {
	account: ExternalTrackingAccount;
}

const ExternalTrackingProviderStatusMeta: FC<ExternalTrackingProviderStatusMetaProps> = ({ account }) => (
	<>
		<div className={ styles.externalTrackingMeta }>
			<span>Last import: { formatExternalTrackingTimestamp(account.lastImportedAt) }</span>
			{ account.status === "connected" && account.tokenExpiresAt ? (
				<span>
					Access token expiry: { formatExternalTrackingTimestamp(account.tokenExpiresAt) }
					{ account.provider === "kitsu" ? " (refresh is automatic)" : null }
				</span>
			) : null }
		</div>
		{ account.lastError ? (
			<Alert
				type="error"
				showIcon
				message={ account.lastError }
			/>
		) : null }
	</>
);

export default ExternalTrackingProviderStatusMeta;
