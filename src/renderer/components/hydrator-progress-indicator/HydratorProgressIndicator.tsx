import {
	CheckOutlined,
	CloseOutlined,
	SyncOutlined,
} from "@ant-design/icons";
import { useHydratorProgressItems } from "./hooks/useHydratorProgressItems";
import styles from "./HydratorProgressIndicator.module.css";

const HydratorProgressIndicator = () => {
	const items = useHydratorProgressItems();

	if (items.length === 0) {
		return null;
	}

	return (
		<div className={ styles.container }>
			{ items.map((item) => (
				<div
					key={ item.taskId }
					className={ `${ styles.item } ${
						item.status === "completed"
							? styles.itemCompleted
							: item.status === "failed"
								? styles.itemFailed
								: styles.itemRunning
					} ${ item.isLeaving ? styles.itemLeaving : "" }` }
				>
					<span
						className={ `${ styles.icon } ${
							item.status === "running"
								? styles.iconRunning
								: item.status === "completed"
									? styles.iconCompleted
									: styles.iconFailed
						}` }
						aria-hidden="true"
					>
						{
							item.status === "running"
								? <SyncOutlined/>
								: item.status === "completed"
									? <CheckOutlined/>
									: <CloseOutlined/>
						}
					</span>
					<span className={ styles.message }>{ item.message }</span>
				</div>
			)) }
		</div>
	);
};

export default HydratorProgressIndicator;
