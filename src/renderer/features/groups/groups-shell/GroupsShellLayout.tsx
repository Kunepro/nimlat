import { PageHeader } from "@nimlat/components";
import { Outlet } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import {
	FC,
	memo,
} from "react";
import styles from "./GroupsShellLayout.module.css";
import {
	groupsShellHeaderConfigAtom,
	useResetGroupsShellHeaderOnUnmount,
} from "./use-groups-shell-header";

const GroupsShellContent: FC   = memo(() => (
	<div className={ styles.content }>
		<Outlet/>
	</div>
));
GroupsShellContent.displayName = "GroupsShellContent";

const GroupsShellLayout: FC = () => {
	const headerConfig = useAtomValue(groupsShellHeaderConfigAtom);
	useResetGroupsShellHeaderOnUnmount();

	return (
		<div className={ styles.layout }>
			<div className={ styles.header }>
				<PageHeader
					title={ headerConfig.title }
					onBack={ headerConfig.onBack }
					isBackEnabled={ headerConfig.isBackEnabled }
					navigationIcon={ headerConfig.navigationIcon }
					centerContent={ headerConfig.centerContent }
					rightContent={ headerConfig.rightContent }
				/>
			</div>
			<GroupsShellContent/>
		</div>
	);
};

export default GroupsShellLayout;
