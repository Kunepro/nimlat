import {
	HomeFilled,
	LeftOutlined,
} from "@ant-design/icons";
import Button from "antd/es/button";
import React, { FC } from "react";
import styles from "./PageHeader.module.css";

type NavigationIcon = "back" | "home";

interface PageHeaderProps {
	title: string;
	onBack: () => void;
	isBackEnabled?: boolean;
	navigationIcon?: NavigationIcon;
	centerContent?: React.ReactNode;
	rightContent?: React.ReactNode;
}

const PageHeader: FC<PageHeaderProps> = ({
																					 title,
																					 onBack,
																					 isBackEnabled = true,
																					 navigationIcon = "back",
																					 centerContent,
																					 rightContent,
																				 }) =>
	(
		<header className={ styles.header }>
			<div className={ styles.left }>
				{ navigationIcon === "home"
					? (
						<span
							className={ styles.leadingIcon }
							aria-hidden="true"
						>
							<HomeFilled/>
						</span>
					)
					: (
						<Button
							shape="circle"
							icon={ <LeftOutlined/> }
							onClick={ onBack }
							disabled={ !isBackEnabled }
							aria-label="Back"
						/>
					) }
				<h1 className={ styles.title }>{ title }</h1>
			</div>
			<div className={ styles.center }>
				{ centerContent }
			</div>
			<div className={ styles.right }>
				{ rightContent }
			</div>
		</header>
	);

export default PageHeader;
