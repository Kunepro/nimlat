import {
	Button,
	Empty,
	Spin,
} from "antd";
import type { FC } from "react";
import {
	getReleaseWatchRowKey,
	RELEASE_WATCH_TABLE_HEADERS,
	type ReleaseWatchRow,
} from "../release-watch-model";
import styles from "../ReleaseWatch.module.css";
import ReleaseWatchRowItem from "./ReleaseWatchRowItem";

interface ReleaseWatchTableProps {
	isLoading: boolean;
	nextOffset: number | null;
	rows: ReleaseWatchRow[];
	onLoadMore: () => void;
}

const ReleaseWatchTable: FC<ReleaseWatchTableProps> = ({
																												 isLoading,
																												 nextOffset,
																												 rows,
																												 onLoadMore,
																											 }) => (
	<div className={ styles.table }>
		<div className={ styles.headerRow }>
			{ RELEASE_WATCH_TABLE_HEADERS.map(header => (
				<span key={ header }>{ header }</span>
			)) }
		</div>
		{ rows.length === 0 && !isLoading ? (
			<div className={ styles.empty }>
				<Empty description="No release-watch rows match this filter."/>
			</div>
		) : (
			<div className={ styles.rows }>
				{ rows.map((row) => (
					<ReleaseWatchRowItem
						key={ getReleaseWatchRowKey(row) }
						row={ row }
					/>
				)) }
			</div>
		) }
		<div className={ styles.footer }>
			{ isLoading && <Spin size="small"/> }
			{ nextOffset != null && (
				<Button
					onClick={ onLoadMore }
					loading={ isLoading }
				>
					Load More
				</Button>
			) }
		</div>
	</div>
);

export default ReleaseWatchTable;
