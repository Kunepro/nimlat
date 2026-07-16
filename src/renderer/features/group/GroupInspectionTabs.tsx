import { useNavigate } from "@tanstack/react-router";
import Tabs from "antd/es/tabs";
import React, { FC } from "react";
import { ROUTES } from "../../constants/route-config";
import { createRouteHistoryState } from "../../types/router-history-state";
import styles from "./GroupInspectionTabs.module.css";

type TabRoutes =
	typeof ROUTES.GROUPS.GROUP.MEDIAS
	| typeof ROUTES.GROUPS.GROUP.DETAILS
	| typeof ROUTES.GROUPS.GROUP.TIMELINE;

interface GroupInspectionTabsProps {
	groupSource: string;
	groupId: string;
	activeKey: TabRoutes;
	groupName?: string;
}

const GroupInspectionTabs: FC<GroupInspectionTabsProps> = ({
																														 groupSource,
																														 groupId,
																														 activeKey,
																														 groupName,
																													 }) => {
	const navigate = useNavigate();

	return (
		<Tabs
			activeKey={ activeKey }
			items={ [
				{
					key:   ROUTES.GROUPS.GROUP.MEDIAS,
					label: "Titles",
				},
				{
					key:   ROUTES.GROUPS.GROUP.DETAILS,
					label: "Details",
				},
				{
					key:   ROUTES.GROUPS.GROUP.TIMELINE,
					label: "Timeline",
				},
			] }
			onChange={ (key) => {
				void navigate({
					to:     key === ROUTES.GROUPS.GROUP.DETAILS
										? ROUTES.GROUPS.GROUP.DETAILS_FULL_URL
										: key === ROUTES.GROUPS.GROUP.TIMELINE
							? ROUTES.GROUPS.GROUP.TIMELINE_FULL_URL
							: ROUTES.GROUPS.GROUP.FULL_URL,
					params: {
						groupSource,
						groupId,
					},
					state: groupName ? createRouteHistoryState({ groupName }) : undefined,
				});
			} }
			className={ styles.tabs }
		/>
	);
};

export default GroupInspectionTabs;
