import Alert from "antd/es/alert";
import Button from "antd/es/button";
import Tooltip from "antd/es/tooltip";
import React, { FC } from "react";
import {
	buildEpisodeUpdatesActivePresentation,
	buildEpisodeUpdatesIssuePresentation,
} from "./episode-updates-status-model";
import styles from "./EpisodeUpdatesStatus.module.css";
import { useEpisodeUpdatesStatus } from "./hooks/useEpisodeUpdatesStatus";

type Props = {
	mediaId: number;
	mode?: "empty-state" | "inline-action";
	onRequestedRetry?: () => void;
};

const EpisodeUpdatesStatus: FC<Props> = ({
																					 mediaId,
																					 mode = "empty-state",
																					 onRequestedRetry,
																				 }) => {
	const {
					isRetrying,
					issue,
					retryEpisodeUpdates,
				} = useEpisodeUpdatesStatus({
		mediaId,
		onRequestedRetry,
	});

	if (!issue) {
		return (
			<div className={ `${ styles.container } ${ styles.actionsOnly }` }>
				<Button
					size="small"
					loading={ isRetrying }
					onClick={ retryEpisodeUpdates }
				>
					Refresh episodes
				</Button>
			</div>
		);
	}

	if (issue.status === "failed") {
		const presentation = buildEpisodeUpdatesIssuePresentation(issue);
		return (
			<div className={ styles.container }>
				<Alert
					type={ presentation.type }
					showIcon
					message={ presentation.message }
					description={ presentation.description }
					action={ presentation.canRetry ? (
						<Button
							size="small"
							loading={ isRetrying }
							onClick={ retryEpisodeUpdates }
						>
							Retry episodes
						</Button>
					) : undefined }
				/>
			</div>
		);
	}

	if (issue.status === "unsupported") {
		const presentation = buildEpisodeUpdatesIssuePresentation(issue);
		return (
			<div className={ styles.container }>
				<Alert
					type={ presentation.type }
					showIcon
					message={ presentation.message }
					description={ presentation.description }
					action={ presentation.canRetry ? (
						<Button
							size="small"
							loading={ isRetrying }
							onClick={ retryEpisodeUpdates }
						>
							Retry episodes
						</Button>
					) : undefined }
				/>
			</div>
		);
	}

	if (issue.status === "processing" || issue.status === "pending") {
		const presentation = issue.reason
			? buildEpisodeUpdatesIssuePresentation(issue)
			: null;
		const activePresentation = buildEpisodeUpdatesActivePresentation(
			issue.status,
			mode,
		);
		if (mode === "inline-action" && !presentation) {
			return (
				<div className={ `${ styles.container } ${ styles.actionsOnly } ${ styles.inlineAction }` }>
					<Tooltip title={ activePresentation.message }>
						<span className={ styles.tooltipButtonWrapper }>
							<Button
								size="small"
								loading
								disabled
							>
								{ activePresentation.buttonLabel }
							</Button>
						</span>
					</Tooltip>
				</div>
			);
		}

		return (
			<div className={ styles.container }>
				<Alert
					type={ presentation?.type || "info" }
					showIcon
					message={ presentation?.message || activePresentation.message }
					description={ presentation?.description }
					action={ (
						<Button
							size="small"
							loading
							disabled
						>
							{ activePresentation.buttonLabel }
						</Button>
					) }
				/>
			</div>
		);
	}

	return null;
};

export default EpisodeUpdatesStatus;
