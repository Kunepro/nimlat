import type { GroupExplorerCard } from "@nimlat/types/ipc-payloads";
import {
	Empty,
	Spin,
} from "antd";
import type { FC } from "react";
import AddToGroupList from "../../AddToGroupList";
import styles from "../../AddToGroupModal.module.css";

interface AddToGroupSectionsProps {
	hasMergeableSelectedGroups: boolean;
	isLoadingGroups: boolean;
	isSubmitting: boolean;
	otherGroups: GroupExplorerCard[];
	preferredGroups: GroupExplorerCard[];
	onAssignToGroup: (groupId: number, isPreferredTarget: boolean) => void;
}

const AddToGroupSections: FC<AddToGroupSectionsProps> = ({
																													 hasMergeableSelectedGroups,
																													 isLoadingGroups,
																													 isSubmitting,
																													 otherGroups,
																													 preferredGroups,
																													 onAssignToGroup,
																												 }) => (
	<div className={ styles.listSection }>
		{ preferredGroups.length > 0 ? (
			<div className={ styles.groupSection }>
				<div className={ styles.sectionTitle }>Selected groups</div>
				<AddToGroupList
					groups={ preferredGroups }
					isPreferredTarget={ true }
					isSubmitting={ isSubmitting }
					hasMergeableSelectedGroups={ hasMergeableSelectedGroups }
					onSelect={ onAssignToGroup }
				/>
			</div>
		) : null }

		<div className={ styles.groupSection }>
			<div className={ styles.sectionTitle }>Other groups</div>
			{ isLoadingGroups ? (
				<div className={ styles.loadingState }>
					<Spin/>
				</div>
			) : otherGroups.length === 0 ? (
				<Empty description="No other groups available."/>
			) : (
				<AddToGroupList
					groups={ otherGroups }
					isPreferredTarget={ false }
					isSubmitting={ isSubmitting }
					hasMergeableSelectedGroups={ hasMergeableSelectedGroups }
					onSelect={ onAssignToGroup }
				/>
			) }
		</div>
	</div>
);

export default AddToGroupSections;
