import { ClusterOutlined } from "@ant-design/icons";
import { GroupExplorerCard } from "@nimlat/types/ipc-payloads";
import {
	type FC,
	memo,
} from "react";
import { resolveImageSrc } from "../../../utils/resolve-image-src";
import styles from "./AddToGroupList.module.css";

interface AddToGroupListProps {
	groups: GroupExplorerCard[];
	isPreferredTarget: boolean;
	isSubmitting: boolean;
	hasMergeableSelectedGroups: boolean;
	onSelect: (groupId: number, isPreferredTarget: boolean) => void;
}

const AddToGroupListComponent: FC<AddToGroupListProps> = ({
																														groups,
																														isPreferredTarget,
																														isSubmitting,
																														hasMergeableSelectedGroups,
																														onSelect,
																													}) => (
	<div className={ styles.groupList }>
		{ groups.map((group, index) => (
			<button
				type="button"
				key={ group.id }
				className={ `${ styles.groupRow } ${ styles[ `rowTone${ index % 3 }` ] }` }
				disabled={ isSubmitting }
				onClick={ () => onSelect(
					group.id,
					isPreferredTarget,
				) }
			>
				<div className={ styles.groupImageWrap }>
					{ group.imageUrl ? (
						<img
							src={ resolveImageSrc(group.imageUrl) }
							alt=""
							className={ styles.groupImage }
							loading="lazy"
						/>
					) : (
						<div className={ styles.groupImagePlaceholder }/>
					) }
				</div>
				<div className={ styles.groupName }>{ group.name }</div>
				{ isPreferredTarget ? (
					<div className={ styles.groupActionBadge }>
						<ClusterOutlined/>
						{ hasMergeableSelectedGroups ? "Keep" : "Selected" }
					</div>
				) : null }
			</button>
		)) }
	</div>
);

function areAddToGroupListPropsEqual(
	previousProps: AddToGroupListProps,
	nextProps: AddToGroupListProps,
): boolean {
	return previousProps.groups === nextProps.groups
		&& previousProps.isPreferredTarget === nextProps.isPreferredTarget
		&& previousProps.isSubmitting === nextProps.isSubmitting
		&& previousProps.hasMergeableSelectedGroups === nextProps.hasMergeableSelectedGroups
		&& previousProps.onSelect === nextProps.onSelect;
}

const AddToGroupList = memo(
	AddToGroupListComponent,
	areAddToGroupListPropsEqual,
);

export default AddToGroupList;
