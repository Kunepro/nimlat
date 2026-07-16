import { Outlet } from "@tanstack/react-router";
import Tabs from "antd/es/tabs";
import { useMediaLayoutController } from "./hooks/useMediaLayoutController";
import styles from "./MediaLayout.module.css";

const MediaLayout = () => {
	const {
					handleTabChange,
					tabItems,
					visibleActiveKey,
				} = useMediaLayoutController();

	return (
		<div className={ styles.layout }>
			<Tabs
				activeKey={ visibleActiveKey }
				items={ tabItems }
				onChange={ handleTabChange }
				className={ styles.tabs }
			/>
			<div className={ styles.content }>
				<Outlet/>
			</div>
		</div>
	);
};

export default MediaLayout;
