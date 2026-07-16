import { PageNavigationHeader } from "@nimlat/components";
import { Outlet } from "@tanstack/react-router";
import { FC } from "react";
import styles from "./ToolPageLayout.module.css";

interface ToolPageLayoutProps {
	title: string;
}

const ToolPageLayout: FC<ToolPageLayoutProps> = ({ title }) => (
	<div className={ styles.layout }>
		<PageNavigationHeader title={ title }/>
		<div className={ styles.content }>
			<Outlet/>
		</div>
	</div>
);

export default ToolPageLayout;
