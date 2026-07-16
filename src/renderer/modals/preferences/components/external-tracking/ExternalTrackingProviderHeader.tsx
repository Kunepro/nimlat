import type { ExternalTrackingAccount } from "@nimlat/types/external-tracking";
import Tag from "antd/es/tag";
import type { FC } from "react";
import {
	getExternalTrackingProviderHint,
	getExternalTrackingProviderName,
	getExternalTrackingStatusColor,
	getExternalTrackingStatusLabel,
} from "../../external-tracking-preferences-model";
import styles from "../../PreferencesModal.module.css";

interface ExternalTrackingProviderHeaderProps {
	account: ExternalTrackingAccount;
}

const ExternalTrackingProviderHeader: FC<ExternalTrackingProviderHeaderProps> = ({ account }) => (
	<div className={ styles.externalTrackingProviderHeader }>
		<div className={ styles.providerDetails }>
			<div className={ styles.providerName }>
				{ getExternalTrackingProviderName(account.provider) }
			</div>
			<div className={ styles.settingHint }>
				{ getExternalTrackingProviderHint(account.provider) }
			</div>
		</div>
		{ account.status === "available" || account.status === "connected" ? null : (
			<Tag color={ getExternalTrackingStatusColor(account) }>
				{ getExternalTrackingStatusLabel(account) }
			</Tag>
		) }
	</div>
);

export default ExternalTrackingProviderHeader;
