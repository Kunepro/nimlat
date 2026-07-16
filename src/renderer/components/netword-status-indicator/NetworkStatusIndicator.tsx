import {
	DisconnectOutlined,
	HourglassOutlined,
} from "@ant-design/icons";
import {
	Badge,
	Tooltip,
} from "antd";
import React from "react";
import {
	useAniListQueueStatus,
	useNetworkStatus,
} from "../../hooks";
import styles from "./NetworkStatusIndicator.module.css";

// Topbar status lights are exception-only: connected/healthy is implied so the
// action buttons do not shift during normal app usage.
const NetworkStatusIndicator: React.FC = () => {
	const isOnline = useNetworkStatus();
	const {
					isPaused,
					remainingSeconds,
				}                     = useAniListQueueStatus();
	const shouldShowNetworkStatus = !isOnline;
	const shouldShowQueueStatus = isPaused;

	if (!shouldShowNetworkStatus && !shouldShowQueueStatus) {
		return null;
	}

	return (
		<div
			data-testid="network-status-indicator"
			className={ styles.indicator }
		>
			{ shouldShowNetworkStatus && (
				<Tooltip title="Offline">
					<Badge status="error">
						<DisconnectOutlined
							data-testid="network-status-offline"
							className={ styles.statusIcon }
						/>
					</Badge>
				</Tooltip>
			) }

			{ shouldShowQueueStatus && (
				<Tooltip title={ `Catalog updates are rate limited. Resuming in ${ remainingSeconds }s` }>
					<Badge status="warning">
						<HourglassOutlined
							data-testid="anilist-rate-limit-paused"
							className={ styles.statusIcon }
						/>
					</Badge>
				</Tooltip>
			) }
		</div>
	);
};

export default NetworkStatusIndicator;
