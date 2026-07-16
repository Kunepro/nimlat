import type {
	ExternalTrackingAccount,
	ExternalTrackingProvider,
	ExternalTrackingSettings,
} from "@nimlat/types/external-tracking";
import type { FC } from "react";
import type { ExternalTrackingProviderDraft } from "../../external-tracking-preferences-model";
import type { ExternalTrackingCredentialMode } from "../../external-tracking-provider-panel-model";
import ExternalTrackingAniListCredentialsForm from "../ExternalTrackingAniListCredentialsForm";
import ExternalTrackingKitsuCredentialsForm from "../ExternalTrackingKitsuCredentialsForm";
import ExternalTrackingPkceCredentialsForm from "../ExternalTrackingPkceCredentialsForm";

interface ExternalTrackingProviderCredentialsProps {
	account: ExternalTrackingAccount;
	credentialMode: ExternalTrackingCredentialMode;
	disabled: boolean;
	draft: ExternalTrackingProviderDraft;
	isBusy: boolean;
	isRetryingSecretStorage: boolean;
	onConnectKitsu: () => void;
	onImportKitsuPublic: () => void;
	onImportKitsuXml: () => void;
	onRequestAniListToken: () => void;
	onRetrySecretStorage: () => void;
	onSaveAniListToken: () => void;
	onStartConnection: (provider: ExternalTrackingProvider) => void;
	onUpdateDraft: (provider: ExternalTrackingProvider, patch: Partial<ExternalTrackingProviderDraft>) => void;
	secretStorage: ExternalTrackingSettings["secretStorage"] | null;
}

const ExternalTrackingProviderCredentials: FC<ExternalTrackingProviderCredentialsProps> = ({
																																														 account,
																																														 credentialMode,
																																														 disabled,
																																														 draft,
																																														 isBusy,
																																														 isRetryingSecretStorage,
																																														 onConnectKitsu,
																																														 onImportKitsuPublic,
																																														 onImportKitsuXml,
																																														 onRequestAniListToken,
																																														 onRetrySecretStorage,
																																														 onSaveAniListToken,
																																														 onStartConnection,
																																														 onUpdateDraft,
																																														 secretStorage,
																																													 }) => credentialMode === "anilist-token"
	? (
		<ExternalTrackingAniListCredentialsForm
			account={ account }
			draft={ draft }
			disabled={ disabled }
			isBusy={ isBusy }
			onRequestAniListToken={ onRequestAniListToken }
			onSaveAniListToken={ onSaveAniListToken }
			onUpdateDraft={ onUpdateDraft }
		/>
	)
	: credentialMode === "kitsu-password" ? (
		<ExternalTrackingKitsuCredentialsForm
			account={ account }
			draft={ draft }
			disabled={ disabled }
			isBusy={ isBusy }
			isRetryingSecretStorage={ isRetryingSecretStorage }
			onConnectKitsu={ onConnectKitsu }
			onImportKitsuPublic={ onImportKitsuPublic }
			onImportKitsuXml={ onImportKitsuXml }
			onRetrySecretStorage={ onRetrySecretStorage }
			onUpdateDraft={ onUpdateDraft }
			secretStorage={ secretStorage }
		/>
	) : (
		<ExternalTrackingPkceCredentialsForm
			account={ account }
			draft={ draft }
			disabled={ disabled }
			isBusy={ isBusy }
			onStartConnection={ onStartConnection }
			onUpdateDraft={ onUpdateDraft }
		/>
	);

export default ExternalTrackingProviderCredentials;
