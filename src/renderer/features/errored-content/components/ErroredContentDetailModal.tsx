import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import Modal from "antd/es/modal";
import { FC } from "react";
import ErroredContentDetailModalBody from "./ErroredContentDetailModalBody";
import ErroredContentDetailModalFooter from "./ErroredContentDetailModalFooter";
import ErroredContentDetailModalTitle from "./ErroredContentDetailModalTitle";

interface ErroredContentDetailModalProps {
	item: ErroredContentItem | null;
	pendingActionKeys: string[];
	onClose: () => void;
	onOpenMedia: (item: ErroredContentItem) => void;
	onRetry: (item: ErroredContentItem) => void;
	onReport: (item: ErroredContentItem) => void;
	onHide: (item: ErroredContentItem) => void;
}

const ErroredContentDetailModal: FC<ErroredContentDetailModalProps> = ({
																																				 item,
																																				 pendingActionKeys,
																																				 onClose,
																																				 onOpenMedia,
																																				 onRetry,
																																				 onReport,
																																				 onHide,
																																			 }) => {
	const openMediaAndClose = (): void => {
		if (item == null) {
			return;
		}
		onOpenMedia(item);
		onClose();
	};

	return (
		<Modal
			open={ item != null }
			title={ (
				<ErroredContentDetailModalTitle
					item={ item }
					onOpenMediaAndClose={ openMediaAndClose }
				/>
			) }
			onCancel={ onClose }
			footer={ (
				<ErroredContentDetailModalFooter
					item={ item }
					pendingActionKeys={ pendingActionKeys }
					onClose={ onClose }
					onOpenMediaAndClose={ openMediaAndClose }
					onRetry={ onRetry }
					onReport={ onReport }
					onHide={ onHide }
				/>
			) }
			width={ 720 }
		>
			<ErroredContentDetailModalBody
				item={ item }
				onOpenMediaAndClose={ openMediaAndClose }
			/>
		</Modal>
	);
};

export default ErroredContentDetailModal;
