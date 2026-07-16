import {
	CheckCircleOutlined,
	LinkOutlined,
} from "@ant-design/icons";
import type {
	ExternalTrackingAccount,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import {
	Button,
	Input,
} from "antd";
import type { FC } from "react";
import type { ExternalTrackingProviderDraft } from "../external-tracking-preferences-model";
import styles from "../PreferencesModal.module.css";

interface ExternalTrackingAniListCredentialsFormProps {
	account: ExternalTrackingAccount;
	draft: ExternalTrackingProviderDraft;
	disabled: boolean;
	isBusy: boolean;
	onRequestAniListToken: () => void;
	onSaveAniListToken: () => void;
	onUpdateDraft: (provider: ExternalTrackingProvider, patch: Partial<ExternalTrackingProviderDraft>) => void;
}

const ExternalTrackingAniListCredentialsForm: FC<ExternalTrackingAniListCredentialsFormProps> = ({
																																																	 account,
																																																	 draft,
																																																	 disabled,
																																																	 isBusy,
																																																	 onRequestAniListToken,
																																																	 onSaveAniListToken,
																																																	 onUpdateDraft,
																																																 }) => (
	<div className={ styles.providerForm }>
		<Input
			value={ draft.clientId }
			placeholder="AniList client ID"
			aria-label="AniList client ID"
			inputMode="numeric"
			disabled={ disabled }
			onChange={ event => onUpdateDraft(
				account.provider,
				{ clientId: event.target.value },
			) }
		/>
		<Button
			icon={ <LinkOutlined/> }
			loading={ isBusy }
			disabled={ disabled || draft.clientId.trim().length === 0 }
			onClick={ onRequestAniListToken }
		>
			Request access token from AniList
		</Button>
		<Input
			value={ draft.token }
			placeholder="Access token or redirect URL"
			aria-label="AniList access token or redirect URL"
			disabled={ disabled }
			onChange={ event => onUpdateDraft(
				account.provider,
				{ token: event.target.value },
			) }
		/>
		<Button
			type="primary"
			icon={ <CheckCircleOutlined/> }
			loading={ isBusy }
			disabled={ disabled }
			onClick={ onSaveAniListToken }
		>
			Save token
		</Button>
	</div>
);

export default ExternalTrackingAniListCredentialsForm;
