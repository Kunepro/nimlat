import { LinkOutlined } from "@ant-design/icons";
import type {
	ExternalTrackingAccount,
	ExternalTrackingProvider,
	ExternalTrackingSettings,
} from "@nimlat/types/external-tracking";
import {
	Button,
	Input,
} from "antd";
import type { FC } from "react";
import type { ExternalTrackingProviderDraft } from "../../../external-tracking-preferences-model";
import styles from "../../../PreferencesModal.module.css";
import ExternalTrackingInfoTooltip from "../ExternalTrackingInfoTooltip";

interface ExternalTrackingKitsuPasswordFormProps {
	account: ExternalTrackingAccount;
	draft: ExternalTrackingProviderDraft;
	disabled: boolean;
	isBusy: boolean;
	isRetryingSecretStorage: boolean;
	onConnect: () => void;
	onRetrySecretStorage: () => void;
	onUpdateDraft: (provider: ExternalTrackingProvider, patch: Partial<ExternalTrackingProviderDraft>) => void;
	secretStorage: ExternalTrackingSettings["secretStorage"] | null;
}

const ExternalTrackingKitsuPasswordForm: FC<ExternalTrackingKitsuPasswordFormProps> = ({
																																												 account,
																																												 draft,
																																												 disabled,
																																												 isBusy,
																																												 isRetryingSecretStorage,
																																												 onConnect,
																																												 onRetrySecretStorage,
																																												 onUpdateDraft,
																																												 secretStorage,
																																											 }) => {
	const secureStorageReady = secretStorage?.security === "os_encrypted";
	const connected          = account.status === "connected";
	const formDisabled       = disabled || connected || !secureStorageReady;
	const retryLabel         = secretStorage?.security === "access_required"
		? "Allow access"
		: "Check again";
	const explanation        = secureStorageReady
		? "Connect Kitsu to enable explicit Import and Export. Your password is used only to sign in and is never saved."
		: secretStorage === null
			? "Checking if this device can keep your Kitsu sign-in secure. You can still import with XML or username."
			: secretStorage.security === "access_required"
				? "Allow access to keep your Kitsu sign-in secure. Your password is never saved. You can still import with XML or username."
				: "Account connection is unavailable because this device cannot store your Kitsu sign-in securely. You can still import with XML or username.";

	return (
		<div className={ styles.providerForm }>
			<ExternalTrackingInfoTooltip
				ariaLabel="About connecting Kitsu"
				content={ explanation }
			/>
			{ !connected ? (
				<>
					<Input
						autoComplete="email"
						type="email"
						value={ draft.email }
						placeholder="Kitsu account email"
						disabled={ formDisabled }
						onChange={ event => onUpdateDraft(
							account.provider,
							{ email: event.target.value },
						) }
					/>
					<Input.Password
						autoComplete="current-password"
						value={ draft.password }
						placeholder="Kitsu password"
						disabled={ formDisabled }
						onChange={ event => onUpdateDraft(
							account.provider,
							{ password: event.target.value },
						) }
					/>
				</>
			) : null }
			{ !secureStorageReady && secretStorage?.retryAvailable ? (
				<Button
					type="primary"
					loading={ isRetryingSecretStorage }
					disabled={ isRetryingSecretStorage }
					onClick={ onRetrySecretStorage }
				>
					{ retryLabel }
				</Button>
			) : (
				<Button
					type="primary"
					icon={ <LinkOutlined/> }
					loading={ isBusy }
					disabled={ connected || formDisabled || draft.email.trim().length === 0 || draft.password.length === 0 }
					onClick={ onConnect }
				>
					Connect to Kitsu
				</Button>
			) }
		</div>
	);
};

export default ExternalTrackingKitsuPasswordForm;
