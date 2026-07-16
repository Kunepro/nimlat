import { FC } from "react";
import styles from "../ErroredContent.module.css";

const ErroredContentHeader: FC = () => (
	<header className={ styles.header }>
		<div>
			<h1 className={ styles.title }>Errored Content</h1>
		</div>
	</header>
);

export default ErroredContentHeader;
