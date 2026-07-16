import {
	AppstoreOutlined,
	ArrowLeftOutlined,
} from "@ant-design/icons";
import { Link } from "@tanstack/react-router";
import { Button } from "antd";
import type { FC } from "react";
import { ROUTES } from "../../constants/route-config";
import styles from "./NotFound404.module.css";

const NotFound404: FC = () => {
	return (
		<div className={ styles.page }>
			<div className={ styles.bgOverlay }/>
			<div className={ styles.panel }>
				<div
					className={ styles.badge }
					aria-hidden="true"
				>
					404
				</div>
				<h1 className={ styles.title }>Lost in the Neon Grid</h1>
				<p className={ styles.subtitle }>
					The route you seek slipped into the void. Maybe it was an illusion, or just a broken link.
				</p>
				<div className={ styles.actions }>
					<Button
						className={ styles.backButton }
						icon={ <ArrowLeftOutlined/> }
						onClick={ () => window.history.back() }
					>
						Go Back
					</Button>
					<Link
						to={ ROUTES.GROUPS.FULL_URL }
						className={ styles.libraryLink }
					>
						<AppstoreOutlined/>
						Enter Library
					</Link>
				</div>
			</div>
			<footer className={ styles.footer }>
				<span className={ styles.glowText }>Nimlat</span>
			</footer>
		</div>
	);
};

export default NotFound404;
