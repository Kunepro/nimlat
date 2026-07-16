import Result from "antd/es/result";
import Spin from "antd/es/spin";
import type { FC } from "react";
import { ROUTES } from "../../../constants/route-config";
import GroupInspectionTabs from "../GroupInspectionTabs";
import { GroupReleaseTimelineTable } from "./components/GroupReleaseTimelineTable";
import styles from "./GroupReleaseTimeline.module.css";
import { useGroupReleaseTimelineController } from "./hooks/useGroupReleaseTimelineController";

const GroupReleaseTimeline: FC = () => {
	const {
					groupId,
					groupSource,
					groupName,
					rows,
					isLoading,
					errorMessage,
				} = useGroupReleaseTimelineController();

	if (isLoading) {
		return (
			<section className="flex-center full-screen-v">
				<Spin size="large"/>
			</section>
		);
	}

	if (errorMessage) {
		return (
			<Result
				status="error"
				title="Could not load release timeline"
				subTitle={ errorMessage }
			/>
		);
	}

	return (
		<section className={ styles.wrapper }>
			<GroupInspectionTabs
				activeKey={ ROUTES.GROUPS.GROUP.TIMELINE }
				groupSource={ groupSource }
				groupId={ groupId }
				groupName={ groupName }
			/>
			<GroupReleaseTimelineTable
				groupId={ groupId }
				groupSource={ groupSource }
				groupName={ groupName }
				rows={ rows }
			/>
		</section>
	);
};

export default GroupReleaseTimeline;
