import type {
	ExternalTrackingAccount,
	ExternalTrackingProvider,
	ExternalTrackingSettings,
} from "@nimlat/types/external-tracking";
import Tabs from "antd/es/tabs";
import type { FC } from "react";
import type { ExternalTrackingProviderDraft } from "../external-tracking-preferences-model";
import ExternalTrackingKitsuPasswordForm from "./external-tracking/kitsu/ExternalTrackingKitsuPasswordForm";
import ExternalTrackingKitsuPublicImportForm from "./external-tracking/kitsu/ExternalTrackingKitsuPublicImportForm";
import ExternalTrackingKitsuXmlImportForm from "./external-tracking/kitsu/ExternalTrackingKitsuXmlImportForm";

interface ExternalTrackingKitsuCredentialsFormProps {
	account: ExternalTrackingAccount;
	draft: ExternalTrackingProviderDraft;
	disabled: boolean;
	isBusy: boolean;
	isRetryingSecretStorage: boolean;
	onConnectKitsu: () => void;
	onImportKitsuPublic: () => void;
	onImportKitsuXml: () => void;
	onRetrySecretStorage: () => void;
	onUpdateDraft: (provider: ExternalTrackingProvider, patch: Partial<ExternalTrackingProviderDraft>) => void;
	secretStorage: ExternalTrackingSettings["secretStorage"] | null;
}

// XML is the default because it provides the safest useful result for most
// users without storing credentials or depending on public-profile visibility.
const ExternalTrackingKitsuCredentialsForm: FC<ExternalTrackingKitsuCredentialsFormProps> = ({
																																															 account,
																																															 draft,
																																															 disabled,
																																															 isBusy,
																																															 isRetryingSecretStorage,
																																															 onConnectKitsu,
																																															 onImportKitsuPublic,
																																															 onImportKitsuXml,
																																															 onRetrySecretStorage,
																																															 onUpdateDraft,
																																															 secretStorage,
																																														 }) => (
	<Tabs
		defaultActiveKey="xml"
		items={ [
			{
				key:      "xml",
				label:    "Import XML",
				children: (
										<ExternalTrackingKitsuXmlImportForm
											disabled={ disabled }
						          isBusy={ isBusy }
						          onImport={ onImportKitsuXml }
										/>
									),
			},
			{
				key:      "public",
				label:    "Import by username",
				children: (
										<ExternalTrackingKitsuPublicImportForm
											account={ account }
						          draft={ draft }
						          disabled={ disabled }
						          isBusy={ isBusy }
						          onImport={ onImportKitsuPublic }
						          onUpdateDraft={ onUpdateDraft }
										/>
									),
			},
			{
				key:      "password",
				label:    "Connect account",
				children: (
										<ExternalTrackingKitsuPasswordForm
											account={ account }
						          draft={ draft }
						          disabled={ disabled }
						          isBusy={ isBusy }
						          isRetryingSecretStorage={ isRetryingSecretStorage }
						          onConnect={ onConnectKitsu }
						          onRetrySecretStorage={ onRetrySecretStorage }
						          onUpdateDraft={ onUpdateDraft }
						          secretStorage={ secretStorage }
										/>
									),
			},
		] }
	/>
);

export default ExternalTrackingKitsuCredentialsForm;
