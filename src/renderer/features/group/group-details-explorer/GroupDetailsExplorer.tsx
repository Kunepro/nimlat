import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import type { FC } from "react";
import { ROUTES } from "../../../constants/route-config";
import GroupInspectionTabs from "../GroupInspectionTabs";
import { GroupDetailsInfoPanel } from "./components/GroupDetailsInfoPanel";
import styles from "./GroupDetailsExplorer.module.css";
import { useGroupDetailsExplorerController } from "./hooks/useGroupDetailsExplorerController";

const GroupDetailsExplorer: FC = () => {
	const {
					groupId,
					groupSource,
					group,
					isLoading,
					errorMessage,
					watchedSummary,
					isUpdatingWatchedState,
					handleGroupWatchedToggle,
				} = useGroupDetailsExplorerController();

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
				title="Could not load group details"
				subTitle={ errorMessage }
			/>
		);
	}

	if (!group) {
		return (
			<section className="flex-center full-screen-v">
				<Empty description="Group not found."/>
			</section>
		);
	}

	return (
		<section className={ styles.wrapper }>
			<GroupInspectionTabs
				activeKey={ ROUTES.GROUPS.GROUP.DETAILS }
				groupSource={ groupSource }
				groupId={ groupId }
				groupName={ group.name }
			/>
			<GroupDetailsInfoPanel
				group={ group }
				watchedSummary={ watchedSummary }
				isUpdatingWatchedState={ isUpdatingWatchedState }
				onGroupWatchedToggle={ handleGroupWatchedToggle }
			/>
		</section>
	);
};

export default GroupDetailsExplorer;
