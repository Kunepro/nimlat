import { InfoCircleOutlined } from "@ant-design/icons";
import Button from "antd/es/button";
import Tooltip from "antd/es/tooltip";
import type { FC } from "react";
import styles from "../../PreferencesModal.module.css";

interface ExternalTrackingInfoTooltipProps {
	ariaLabel: string;
	content: string;
}

// The icon is a real button so the same explanation is reachable by mouse,
// keyboard, and touch instead of depending on hover alone.
const ExternalTrackingInfoTooltip: FC<ExternalTrackingInfoTooltipProps> = ({
																																						 ariaLabel,
																																						 content,
																																					 }) => (
	<div className={ styles.externalTrackingInfoRow }>
		<Tooltip title={ content }>
			<Button
				type="text"
				size="small"
				className={ styles.externalTrackingInfoButton }
				aria-label={ ariaLabel }
				icon={ <InfoCircleOutlined/> }
			/>
		</Tooltip>
	</div>
);

export default ExternalTrackingInfoTooltip;
