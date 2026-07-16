import {
	HydratorProgressIndicator,
	TopBar,
} from "@nimlat/components";
import { Outlet } from "@tanstack/react-router";
import styles from "./AppLayout.module.css";

const AppLayout = () =>
	(
		<div className={ styles.layout }>
			<TopBar/>

			<div className={ styles.content }>
				<Outlet/>
			</div>
			<HydratorProgressIndicator/>
		</div>
	);

export default AppLayout;
