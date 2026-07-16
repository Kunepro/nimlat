import { FileTextOutlined } from "@ant-design/icons";
import Button from "antd/es/button";
import type { FC } from "react";
import styles from "../../../PreferencesModal.module.css";
import ExternalTrackingInfoTooltip from "../ExternalTrackingInfoTooltip";

interface ExternalTrackingKitsuXmlImportFormProps {
	disabled: boolean;
	isBusy: boolean;
	onImport: () => void;
}

const ExternalTrackingKitsuXmlImportForm: FC<ExternalTrackingKitsuXmlImportFormProps> = ({
																																													 disabled,
																																													 isBusy,
																																													 onImport,
																																												 }) => (
	<div className={ styles.providerForm }>
		<ExternalTrackingInfoTooltip
			ariaLabel="About Kitsu XML import"
			content="Bring your Kitsu anime list into Nimlat using Kitsu’s XML export. Changes made in Nimlat aren’t sent to Kitsu."
		/>
		<Button
			type="primary"
			icon={ <FileTextOutlined/> }
			loading={ isBusy }
			disabled={ disabled }
			onClick={ onImport }
		>
			Choose XML file
		</Button>
	</div>
);

export default ExternalTrackingKitsuXmlImportForm;
