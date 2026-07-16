import type {
	ExternalTrackingAccount,
	ExternalTrackingExportProgressEvent,
	ExternalTrackingSettings,
} from "@nimlat/types/external-tracking";
import type { CollapseProps } from "antd";
import Alert from "antd/es/alert";
import type {
	ExternalTrackingActionFeedbackType,
	ExternalTrackingProviderDraft,
} from "../external-tracking-preferences-model";
import {
	createExternalTrackingProviderPanelViewModel,
	type ExternalTrackingProviderPanelActions,
} from "../external-tracking-provider-panel-model";
import styles from "../PreferencesModal.module.css";
import ExternalTrackingProviderActions from "./external-tracking/ExternalTrackingProviderActions";
import ExternalTrackingProviderCredentials from "./external-tracking/ExternalTrackingProviderCredentials";
import ExternalTrackingProviderHeader from "./external-tracking/ExternalTrackingProviderHeader";
import ExternalTrackingProviderStatusMeta from "./external-tracking/ExternalTrackingProviderStatusMeta";
import ExternalTrackingProviderToggle from "./external-tracking/ExternalTrackingProviderToggle";

interface CreateExternalTrackingProviderCollapseItemOptions {
	actions: ExternalTrackingProviderPanelActions;
	account: ExternalTrackingAccount;
	draft: ExternalTrackingProviderDraft;
	exportProgress: ExternalTrackingExportProgressEvent | null;
	feedbackMessage: string | null;
	feedbackType: ExternalTrackingActionFeedbackType | null;
	isBusy: boolean;
	isLast: boolean;
	isRetryingSecretStorage: boolean;
	isZapped: boolean;
	onRetrySecretStorage: () => void;
	secretStorage: ExternalTrackingSettings["secretStorage"] | null;
}

type ExternalTrackingProviderCollapseItem = NonNullable<CollapseProps["items"]>[number];

// Collapse must own the item descriptor directly. Wrapping the legacy Panel
// component causes rc-collapse to inject its click state into the wrapper,
// where those internal props are lost and the provider can never open.
export function createExternalTrackingProviderCollapseItem({
	actions,
	account,
	draft,
																														 exportProgress,
																														 feedbackMessage,
																														 feedbackType,
	isBusy,
	isLast,
																														 isRetryingSecretStorage,
	isZapped,
																														 onRetrySecretStorage,
																														 secretStorage,
}: CreateExternalTrackingProviderCollapseItemOptions): ExternalTrackingProviderCollapseItem {
	const viewModel = createExternalTrackingProviderPanelViewModel(account);

	return {
		key:       account.provider,
		className: [
				styles.externalTrackingProvider,
				isLast ? styles.externalTrackingProviderLast : "",
				isZapped ? styles.externalTrackingProviderZapped : "",
			].filter(Boolean).join(" "),
		label: <ExternalTrackingProviderHeader account={ account }/>,
		extra: (
				<ExternalTrackingProviderToggle
					checked={ viewModel.integrated }
					isZapped={ isZapped }
					providerName={ viewModel.providerName }
				/>
			),
		children: (
			<div className={ styles.externalTrackingPanelBody }>
				<ExternalTrackingProviderStatusMeta account={ account }/>
				<ExternalTrackingProviderCredentials
					account={ account }
					credentialMode={ viewModel.credentialMode }
					disabled={ viewModel.disabled }
					draft={ draft }
					isBusy={ isBusy }
					isRetryingSecretStorage={ isRetryingSecretStorage }
					onConnectKitsu={ actions.connectKitsu }
					onImportKitsuPublic={ actions.importKitsuPublic }
					onImportKitsuXml={ actions.importKitsuXml }
					onRequestAniListToken={ actions.requestAniListToken }
					onSaveAniListToken={ actions.saveAniListToken }
					onRetrySecretStorage={ onRetrySecretStorage }
					onStartConnection={ actions.startConnection }
					secretStorage={ secretStorage }
					onUpdateDraft={ actions.updateDraft }
				/>
				{ feedbackMessage ? (
					<Alert
						showIcon
						type={ feedbackType ?? "success" }
						message={ feedbackMessage }
						role={ feedbackType === "error" ? "alert" : "status" }
					/>
				) : null }
				{ account.provider !== "kitsu" || viewModel.connected ? (
					<ExternalTrackingProviderActions
						actionDisabled={ viewModel.actionDisabled }
						isBusy={ isBusy }
						exportProgress={ exportProgress }
						provider={ account.provider }
						onDisconnect={ actions.disconnect }
						onExport={ actions.exportProvider }
						onImport={ actions.importProvider }
					/>
				) : null }
			</div>
		),
	};
}
