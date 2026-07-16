import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import Tag from "antd/es/tag";
import type { FC } from "react";
import { buildErroredContentDetailViewModel } from "../errored-content-detail-model";
import styles from "../ErroredContent.module.css";
import ErroredContentDetailGrid from "./ErroredContentDetailGrid";
import ErroredContentErrorMessagePanel from "./ErroredContentErrorMessagePanel";
import ErroredContentStatusChips from "./ErroredContentStatusChips";

interface ErroredContentDetailModalBodyProps {
	item: ErroredContentItem | null;
	onOpenMediaAndClose: () => void;
}

const ErroredContentDetailModalBody: FC<ErroredContentDetailModalBodyProps> = ({
																																								 item,
																																								 onOpenMediaAndClose,
																																							 }) => {
	if (item == null) {
		return null;
	}

	const viewModel = buildErroredContentDetailViewModel(item);

	return (
		<div className={ styles.detailModalContent }>
			<div className={ styles.detailChips }>
				<Tag color="red">{ viewModel.queueLabel }</Tag>
				<ErroredContentStatusChips item={ item }/>
			</div>
			<ErroredContentDetailGrid
				item={ item }
				rows={ viewModel.detailRows }
				onOpenMediaAndClose={ onOpenMediaAndClose }
			/>
			<ErroredContentErrorMessagePanel
				links={ viewModel.detailLinks }
				message={ viewModel.displayedErrorMessage }
			/>
		</div>
	);
};

export default ErroredContentDetailModalBody;
