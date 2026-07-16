import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import Button from "antd/es/button";
import { FC } from "react";
import styles from "../ErroredContent.module.css";

interface ErroredContentDetailModalTitleProps {
	item: ErroredContentItem | null;
	onOpenMediaAndClose: () => void;
}

const ErroredContentDetailModalTitle: FC<ErroredContentDetailModalTitleProps> = ({
																																									 item,
																																									 onOpenMediaAndClose,
																																								 }) => {
	if (item == null) {
		return "Error details";
	}

	return (
		<Button
			type="link"
			className={ styles.modalTitleButton }
			disabled={ !item.canOpenMedia }
			onClick={ onOpenMediaAndClose }
		>
			{ item.name } error details
		</Button>
	);
};

export default ErroredContentDetailModalTitle;
