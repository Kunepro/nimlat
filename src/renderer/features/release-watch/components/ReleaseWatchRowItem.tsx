import { Link } from "@tanstack/react-router";
import {
	Progress,
	Tag,
} from "antd";
import {
	type FC,
	memo,
} from "react";
import { ROUTES } from "../../../constants/route-config";
import { createRouteHistoryState } from "../../../types/router-history-state";
import {
	buildReleaseWatchRowViewModel,
	getReleaseWatchRowKey,
	type ReleaseWatchRow,
} from "../release-watch-model";
import styles from "../ReleaseWatch.module.css";

interface ReleaseWatchRowItemProps {
	row: ReleaseWatchRow;
}

const ReleaseWatchRowItemComponent: FC<ReleaseWatchRowItemProps> = ({ row }) => {
	const viewModel = buildReleaseWatchRowViewModel(row);

	return (
		<div
			key={ getReleaseWatchRowKey(row) }
			className={ styles.row }
			data-testid="release-watch-row"
		>
			<div className={ styles.mediaCell }>
				<Link
					to={ ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS_FULL_URL }
					params={ { mediaId: row.mediaId.toString() } }
					state={ createRouteHistoryState({
						mediaName: row.name,
						isFilm:    viewModel.isFilm,
					}) }
					className={ styles.nameLink }
				>
					{ row.name }
				</Link>
				<div className={ styles.meta }>
					{ viewModel.mediaMeta }
				</div>
			</div>
			<div>
				<Tag color={ viewModel.stateColor }>
					{ viewModel.stateLabel }
				</Tag>
			</div>
			<div className={ styles.dateCell }>
				{ viewModel.releaseDateText }
				<div className={ styles.meta }>
					{ viewModel.releaseSourceLabel }
				</div>
			</div>
			<div className={ styles.meta }>
				{ viewModel.shouldShowProgress ? (
					<div className={ styles.integrationProgress }>
						<Progress
							percent={ viewModel.integrationPercent }
							size="small"
						/>
					</div>
				) : (
					<span className={ styles.meta }>-</span>
				) }
			</div>
		</div>
	);
};

const ReleaseWatchRowItem = memo(ReleaseWatchRowItemComponent);

export default ReleaseWatchRowItem;
