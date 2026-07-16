import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	Button,
	Tag,
} from "antd";
import type { FC } from "react";
import { buildErroredContentRowViewModel } from "../errored-content-row-model";
import styles from "../ErroredContent.module.css";
import ErroredContentActions from "./ErroredContentActions";
import ErroredContentStatusChips from "./ErroredContentStatusChips";

interface ErroredContentRowProps {
	item: ErroredContentItem;
	pendingActionKeys: string[];
	onOpenMedia: (item: ErroredContentItem) => void;
	onRetry: (item: ErroredContentItem) => void;
	onReport: (item: ErroredContentItem) => void;
	onHide: (item: ErroredContentItem) => void;
	onOpenDetails: (item: ErroredContentItem) => void;
}

const ErroredContentRow: FC<ErroredContentRowProps> = ({
																												 item,
																												 pendingActionKeys,
																												 onOpenMedia,
																												 onRetry,
																												 onReport,
																												 onHide,
																												 onOpenDetails,
																											 }) => {
	const viewModel = buildErroredContentRowViewModel(item);

	return (
		<div
			className={ styles.row }
			data-testid="errored-content-row"
		>
			<div className={ styles.mediaCell }>
				<Button
					type="link"
					className={ styles.nameButton }
					disabled={ !item.canOpenMedia }
					onClick={ () => onOpenMedia(item) }
				>
					{ item.name }
				</Button>
				<div className={ styles.meta }>
					{ viewModel.mediaMeta }
				</div>
			</div>
			<div className={ styles.queueCell }>
				<Tag color="red">{ viewModel.queueLabel }</Tag>
			</div>
			<div className={ styles.flagCell }>
				<ErroredContentStatusChips item={ item }/>
			</div>
			<div className={ styles.retryCell }>
				<div className={ styles.meta }>{ viewModel.retryMeta }</div>
				<div className={ styles.fingerprint }>{ item.fingerprint }</div>
			</div>
			<div className={ styles.errorCell }>
				<div className={ styles.reason }>{ viewModel.errorReason }</div>
				<div className={ styles.errorText }>
					{ viewModel.errorMessage }
				</div>
			</div>
			<div className={ styles.meta }>
				{ viewModel.lastTriedText }
			</div>
			<ErroredContentActions
				item={ item }
				pendingActionKeys={ pendingActionKeys }
				onRetry={ onRetry }
				onReport={ onReport }
				onHide={ onHide }
				onOpenDetails={ onOpenDetails }
			/>
		</div>
	);
};

export default ErroredContentRow;
