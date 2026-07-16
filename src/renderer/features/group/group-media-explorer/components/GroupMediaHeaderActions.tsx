import { DeleteOutlined } from "@ant-design/icons";
import { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import { GroupRef } from "@nimlat/types/nimlat-ids";
import Button from "antd/es/button";
import Popconfirm from "antd/es/popconfirm";
import type { FC } from "react";
import GroupCompletionHeader from "../../GroupCompletionHeader";
import styles from "../GroupMediaExplorer.module.css";

interface GroupMediaHeaderActionsProps {
	group: GroupInspectionSummary | null;
	groupRef: GroupRef | null;
	selectedMediaCount: number;
	onRemoveSelectedMedias: () => void;
}

const GroupMediaHeaderActions: FC<GroupMediaHeaderActionsProps> = ({
																																		 group,
																																		 groupRef,
																																		 selectedMediaCount,
																																		 onRemoveSelectedMedias,
																																	 }) => (
	<div className={ styles.headerActions }>
		<Popconfirm
			title={ selectedMediaCount > 1
				? `Remove ${ selectedMediaCount } titles from this group?`
				: "Remove selected title from this group?" }
			description={ selectedMediaCount > 1
				? "The titles will stay in your library, but they will no longer belong to this group."
				: undefined }
			okText="Remove"
			cancelText="Cancel"
			okButtonProps={ { danger: true } }
			disabled={ selectedMediaCount <= 1 }
			onConfirm={ onRemoveSelectedMedias }
		>
			<Button
				type="primary"
				danger
				icon={ <DeleteOutlined/> }
				disabled={ selectedMediaCount === 0 }
				onClick={ selectedMediaCount <= 1 ? onRemoveSelectedMedias : undefined }
			>
				Remove
			</Button>
		</Popconfirm>
		<GroupCompletionHeader
			group={ group }
			groupRef={ groupRef }
		/>
	</div>
);

export default GroupMediaHeaderActions;
