import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import Button from "antd/es/button";
import { FC } from "react";
import ErroredContentActions from "./ErroredContentActions";

interface ErroredContentDetailModalFooterProps {
	item: ErroredContentItem | null;
	pendingActionKeys: string[];
	onClose: () => void;
	onOpenMediaAndClose: () => void;
	onRetry: (item: ErroredContentItem) => void;
	onReport: (item: ErroredContentItem) => void;
	onHide: (item: ErroredContentItem) => void;
}

const ErroredContentDetailModalFooter: FC<ErroredContentDetailModalFooterProps> = ({
																																										 item,
																																										 pendingActionKeys,
																																										 onClose,
																																										 onOpenMediaAndClose,
																																										 onRetry,
																																										 onReport,
																																										 onHide,
																																									 }) => (
	<>
		{ item == null ? null : (
			<ErroredContentActions
				item={ item }
				pendingActionKeys={ pendingActionKeys }
				onRetry={ onRetry }
				onReport={ onReport }
				onHide={ onHide }
			/>
		) }
		<Button onClick={ onClose }>
			Close
		</Button>
		<Button
			type="primary"
			disabled={ item?.canOpenMedia !== true }
			onClick={ onOpenMediaAndClose }
		>
			Open Anime Page
		</Button>
	</>
);

export default ErroredContentDetailModalFooter;
