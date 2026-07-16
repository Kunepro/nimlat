import { getIntegrationStatusLabel } from "@nimlat/constants/integration-status";
import type { GroupReleaseTimelineRow } from "@nimlat/types/release-watch";
import { Link } from "@tanstack/react-router";
import Empty from "antd/es/empty";
import Tag from "antd/es/tag";
import { ROUTES } from "../../../../constants/route-config";
import { createRouteHistoryState } from "../../../../types/router-history-state";
import {
	formatMediaStatus,
	formatNextAiringEpisode,
	formatReleaseDate,
} from "../group-release-timeline-model";
import styles from "../GroupReleaseTimeline.module.css";

interface GroupReleaseTimelineTableProps {
	groupId: string;
	groupSource: string;
	groupName: string | undefined;
	rows: GroupReleaseTimelineRow[];
}

export function GroupReleaseTimelineTable({
																						groupId,
																						groupSource,
																						groupName,
																						rows,
																					}: GroupReleaseTimelineTableProps) {
	return (
		<div className={ styles.table }>
			<div className={ styles.headerRow }>
				<span>Title</span>
				<span>Release</span>
				<span>Status</span>
				<span>Next airing episode</span>
				<span>Integration</span>
			</div>
			{ rows.length === 0 ? (
				<div className={ styles.empty }>
					<Empty description="No titles are visible in this group."/>
				</div>
			) : (
				<div className={ styles.rows }>
					{ rows.map((row) => (
						<div
							key={ row.mediaId }
							className={ styles.row }
							data-testid="group-release-timeline-row"
						>
							<div className={ styles.mediaCell }>
								<Link
									to={ ROUTES.GROUPS.MEDIA.DETAILS_FULL_URL }
									params={ {
										groupSource,
										groupId,
										mediaId: row.mediaId.toString(),
									} }
									state={ createRouteHistoryState({
										groupName,
										mediaName: row.name,
										isFilm:    row.format === "MOVIE",
									}) }
									className={ styles.nameLink }
								>
									{ row.name }
								</Link>
								<div className={ styles.meta }>
									{ row.format ?? "Unknown format" } - ID { row.mediaId }
								</div>
							</div>
							<div>
								{ formatReleaseDate(row.resolvedReleaseAt) }
								<div className={ styles.meta }>
									{ row.releaseDatePrecision }
								</div>
							</div>
							<div>
								<Tag color={ row.status === "RELEASING" ? "green" : "default" }>
									{ formatMediaStatus(row.status) }
								</Tag>
							</div>
							<div className={ styles.meta }>
								{ formatNextAiringEpisode(row) }
							</div>
							<div className={ styles.meta }>
								{ getIntegrationStatusLabel(row.integrationStatus) }
								{ typeof row.integrationPercent === "number" && ` - ${ Math.round(row.integrationPercent) }%` }
							</div>
						</div>
					)) }
				</div>
			) }
		</div>
	);
}
