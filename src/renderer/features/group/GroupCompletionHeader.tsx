import { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import { GroupRef } from "@nimlat/types/nimlat-ids";
import { FC } from "react";
import styles from "./GroupCompletionHeader.module.css";
import { useGroupCompletionPercent } from "./hooks/useGroupCompletionPercent";

interface GroupCompletionHeaderProps {
	group?: GroupInspectionSummary | null;
	groupRef: GroupRef | null;
}

const GroupCompletionHeader: FC<GroupCompletionHeaderProps> = ({
																																 group,
																																 groupRef,
																															 }) => {
	const completionPercent = useGroupCompletionPercent({
		group,
		groupRef,
	});

	if (completionPercent == null) {
		return null;
	}

	return (
		<div
			className={ styles.completion }
			aria-label={ `Group completion ${ completionPercent } percent` }
		>
			<div className={ styles.track }>
				<div
					className={ `${ styles.fill } ${ completionPercent === 100 ? styles.fillComplete : "" }` }
					style={ { width: `${ completionPercent }%` } }
				/>
			</div>
			<div className={ styles.value }>{ completionPercent }%</div>
		</div>
	);
};

export default GroupCompletionHeader;
