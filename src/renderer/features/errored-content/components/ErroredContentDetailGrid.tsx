import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import Button from "antd/es/button";
import type { FC } from "react";
import { Fragment } from "react";
import type { ErroredContentDetailRow } from "../errored-content-detail-model";
import styles from "../ErroredContent.module.css";

interface ErroredContentDetailGridProps {
	item: ErroredContentItem;
	rows: ErroredContentDetailRow[];
	onOpenMediaAndClose: () => void;
}

const ErroredContentDetailGrid: FC<ErroredContentDetailGridProps> = ({
																																			 item,
																																			 rows,
																																			 onOpenMediaAndClose,
																																		 }) => (
	<div className={ styles.detailGrid }>
		<span>Anime</span>
		<Button
			type="link"
			className={ styles.detailMediaLink }
			disabled={ !item.canOpenMedia }
			onClick={ onOpenMediaAndClose }
		>
			{ item.name }
		</Button>
		{ rows.map(row => (
			<Fragment key={ row.label }>
				<span>{ row.label }</span>
				<strong>{ row.value }</strong>
			</Fragment>
		)) }
	</div>
);

export default ErroredContentDetailGrid;
