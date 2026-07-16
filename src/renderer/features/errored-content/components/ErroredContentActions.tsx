import {
	BugOutlined,
	DeleteOutlined,
	EyeOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	Button,
	Popconfirm,
	Tooltip,
} from "antd";
import type { FC } from "react";
import { buildErroredContentActionState } from "../errored-content-actions-model";
import styles from "../ErroredContent.module.css";

interface ErroredContentActionsProps {
	item: ErroredContentItem;
	pendingActionKeys: string[];
	onRetry: (item: ErroredContentItem) => void;
	onReport: (item: ErroredContentItem) => void;
	onHide: (item: ErroredContentItem) => void;
	onOpenDetails?: (item: ErroredContentItem) => void;
}

const ErroredContentActions: FC<ErroredContentActionsProps> = ({
																																 item,
																																 pendingActionKeys,
																																 onRetry,
																																 onReport,
																																 onHide,
																																 onOpenDetails,
																															 }) => {
	const actionState = buildErroredContentActionState(
		item,
		pendingActionKeys,
	);

	return (
		<div className={ styles.actions }>
			<Tooltip title={ actionState.retryTooltip }>
				<Button
					size="small"
					type={ actionState.isRetryRecommended ? "primary" : "default" }
					icon={ <ReloadOutlined/> }
					loading={ actionState.isRetrying }
					disabled={ actionState.retryDisabled }
					onClick={ () => onRetry(item) }
				>
					Retry
				</Button>
			</Tooltip>
			<Button
				size="small"
				icon={ <BugOutlined/> }
				loading={ actionState.isReporting }
				disabled={ actionState.reportDisabled }
				onClick={ () => onReport(item) }
			>
				Report
			</Button>
			<Popconfirm
				title="Hide this failed item?"
				description="This hides the error from the default list. Use Show Hidden to reveal it again."
				okText="Hide"
				cancelText="Cancel"
				onConfirm={ () => onHide(item) }
			>
				<Button
					size="small"
					icon={ <DeleteOutlined/> }
					loading={ actionState.isHiding }
					disabled={ actionState.hideDisabled }
				>
					Hide
				</Button>
			</Popconfirm>
			{ onOpenDetails ? (
				<Button
					size="small"
					icon={ <EyeOutlined/> }
					onClick={ () => onOpenDetails(item) }
				>
					Open
				</Button>
			) : null }
		</div>
	);
};

export default ErroredContentActions;
