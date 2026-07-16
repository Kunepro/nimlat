import {
	CloudDownloadOutlined,
	CloudUploadOutlined,
	DisconnectOutlined,
	InfoCircleOutlined,
} from "@ant-design/icons";
import type {
	ExternalTrackingExportProgressEvent,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import Button from "antd/es/button";
import Tooltip from "antd/es/tooltip";
import type { FC } from "react";
import { getExternalTrackingProviderName } from "../../external-tracking-preferences-model";
import styles from "../../PreferencesModal.module.css";

interface ExternalTrackingProviderActionsProps {
	actionDisabled: boolean;
	exportProgress: ExternalTrackingExportProgressEvent | null;
	isBusy: boolean;
	provider: ExternalTrackingProvider;
	onDisconnect: (provider: ExternalTrackingProvider) => void;
	onExport: (provider: ExternalTrackingProvider) => void;
	onImport: (provider: ExternalTrackingProvider) => void;
}

const ExternalTrackingProviderActions: FC<ExternalTrackingProviderActionsProps> = ({
																																										 actionDisabled,
																																										 exportProgress,
																																										 isBusy,
																																										 provider,
																																										 onDisconnect,
																																										 onExport,
																																										 onImport,
																																									 }) => (
	<>
		<div className={ styles.providerFormActions }>
			<Button
				icon={ <CloudDownloadOutlined/> }
				loading={ isBusy }
				disabled={ actionDisabled }
				onClick={ () => onImport(provider) }
			>
				{ `Import from ${ getExternalTrackingProviderName(provider) }` }
			</Button>
			<Button
				icon={ <CloudUploadOutlined/> }
				loading={ isBusy }
				disabled={ actionDisabled }
				onClick={ () => onExport(provider) }
			>
				{ `Export to ${ getExternalTrackingProviderName(provider) }` }
			</Button>
			<Button
				danger
				icon={ <DisconnectOutlined/> }
				loading={ isBusy }
				disabled={ actionDisabled }
				onClick={ () => onDisconnect(provider) }
			>
				Disconnect
			</Button>
		</div>
		{ exportProgress ? (
			<div
				className={ styles.externalTrackingExportProgress }
				role="status"
				aria-live="polite"
			>
				<span>{ `Exporting to Kitsu: ${ exportProgress.completedItems }/${ exportProgress.totalItems }` }</span>
				<Tooltip title="Kitsu limits how quickly updates can be sent, so larger exports may take a little longer.">
					<span
						className={ styles.externalTrackingExportInfo }
						role="img"
						aria-label="Why Kitsu exports can take longer"
						tabIndex={ 0 }
					>
						<InfoCircleOutlined/>
					</span>
				</Tooltip>
			</div>
		) : null }
	</>
);

export default ExternalTrackingProviderActions;
