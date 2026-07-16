import type {
	FC,
	MouseEvent,
} from "react";
import { ExternalNavigationFacade } from "../../../facades";
import styles from "../ErroredContent.module.css";

interface ErroredContentErrorMessagePanelProps {
	links: string[];
	message: string;
}

function openExternalLink(event: MouseEvent<HTMLAnchorElement>, href: string): void {
	event.preventDefault();
	void ExternalNavigationFacade.openExternalUrl(href);
}

const ErroredContentErrorMessagePanel: FC<ErroredContentErrorMessagePanelProps> = ({
																																										 links,
																																										 message,
																																									 }) => (
	<>
		<div>
			<div className={ styles.detailLabel }>Error message</div>
			<pre className={ styles.errorBlock }>{ message }</pre>
		</div>
		{ links.length > 0 ? (
			<div>
				<div className={ styles.detailLabel }>Links found in the error</div>
				<div className={ styles.linkList }>
					{ links.map(link => (
						<a
							key={ link }
							href={ link }
							onClick={ event => openExternalLink(
								event,
								link,
							) }
						>
							{ link }
						</a>
					)) }
				</div>
			</div>
		) : null }
	</>
);

export default ErroredContentErrorMessagePanel;
