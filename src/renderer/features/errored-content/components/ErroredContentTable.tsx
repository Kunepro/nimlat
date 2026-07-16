import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	Button,
	Empty,
	Spin,
} from "antd";
import type { FC } from "react";
import {
	ERRORED_CONTENT_TABLE_HEADERS,
	getErroredContentRowKey,
} from "../errored-content-row-model";
import styles from "../ErroredContent.module.css";
import ErroredContentRow from "./ErroredContentRow";

interface ErroredContentTableProps {
	items: ErroredContentItem[];
	pendingActionKeys: string[];
	isLoading: boolean;
	canLoadMore: boolean;
	onLoadMore: () => void;
	onOpenMedia: (item: ErroredContentItem) => void;
	onRetry: (item: ErroredContentItem) => void;
	onReport: (item: ErroredContentItem) => void;
	onHide: (item: ErroredContentItem) => void;
	onOpenDetails: (item: ErroredContentItem) => void;
}

const ErroredContentTable: FC<ErroredContentTableProps> = ({
																														 items,
																														 pendingActionKeys,
																														 isLoading,
																														 canLoadMore,
																														 onLoadMore,
																														 onOpenMedia,
																														 onRetry,
																														 onReport,
																														 onHide,
																														 onOpenDetails,
																													 }) => (
	<div className={ styles.table }>
		<div className={ styles.headerRow }>
			{ ERRORED_CONTENT_TABLE_HEADERS.map(header => (
				<span key={ header }>{ header }</span>
			)) }
		</div>

		{ items.length === 0 && !isLoading ? (
			<div className={ styles.empty }>
				<Empty description="No failed queue items."/>
			</div>
		) : (
			<div className={ styles.rows }>
				{ items.map((item) => (
					<ErroredContentRow
						key={ getErroredContentRowKey(item) }
						item={ item }
						pendingActionKeys={ pendingActionKeys }
						onOpenMedia={ onOpenMedia }
						onRetry={ onRetry }
						onReport={ onReport }
						onHide={ onHide }
						onOpenDetails={ onOpenDetails }
					/>
				)) }
			</div>
		) }

		<div className={ styles.footer }>
			{ isLoading && <Spin size="small"/> }
			{ canLoadMore ? (
				<Button
					onClick={ onLoadMore }
					loading={ isLoading }
				>
					Load More
				</Button>
			) : null }
		</div>
	</div>
);

export default ErroredContentTable;
