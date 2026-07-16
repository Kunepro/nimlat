import Collapse from "antd/es/collapse";
import type { FC } from "react";
import { normalizeOpenExternalTrackingProviderKeys } from "../external-tracking-preferences-model";
import { useExternalTrackingPreferencesController } from "../hooks/useExternalTrackingPreferencesController";
import styles from "../PreferencesModal.module.css";
import { createExternalTrackingProviderCollapseItem } from "./ExternalTrackingProviderPanel";
import ExternalTrackingSecretStorageAlert from "./ExternalTrackingSecretStorageAlert";

const ExternalTrackingPreferencesSection: FC = () => {
	const {
					accounts,
					busyProvider,
					drafts,
					exportProgress,
					message,
					messageProvider,
					messageType,
					openProviders,
					panelActions,
					isRetryingSecretStorage,
					retrySecretStorage,
					secretStorage,
					zappedProvider,
					setOpenProviders,
				} = useExternalTrackingPreferencesController();

	return (
		<div className={ `${ styles.settingColumn } ${ styles.externalTrackingSection }` }>
			<Collapse
				activeKey={ openProviders }
				bordered={ false }
				className={ styles.externalTrackingProviders }
				items={ accounts.map((account, index) => createExternalTrackingProviderCollapseItem({
					actions: panelActions,
					account,
					draft: drafts[ account.provider ],
					exportProgress:       exportProgress?.provider === account.provider ? exportProgress : null,
					feedbackMessage:      messageProvider === account.provider ? message : null,
					feedbackType:         messageProvider === account.provider ? messageType : null,
					isBusy: busyProvider === account.provider,
					isLast: index === accounts.length - 1,
					isRetryingSecretStorage,
					isZapped: zappedProvider === account.provider,
					onRetrySecretStorage: retrySecretStorage,
					secretStorage,
				})) }
				onChange={ keys => setOpenProviders(normalizeOpenExternalTrackingProviderKeys(keys)) }
			/>
			{ secretStorage ? (
				<ExternalTrackingSecretStorageAlert
					status={ secretStorage }
					isRetrying={ isRetryingSecretStorage }
					onRetry={ retrySecretStorage }
				/>
			) : null }
		</div>
	);
};

export default ExternalTrackingPreferencesSection;
