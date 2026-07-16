import { Outlet } from "@tanstack/react-router";
import styles from "./GroupLayout.module.css";

const GroupLayout = () => {
	return (
		<div className={ styles.layout }>
			<div className={ styles.content }>
				<Outlet/>
			</div>
		</div>
	);
};

export default GroupLayout;
