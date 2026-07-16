import { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";
import { Typography } from "antd";
import { FC } from "react";
import styles from "../PopulateAnimeDb.module.css";

const STATUS_LABELS: Record<PopulateAnimeDbProgressData["currentStatus"], string> = {
	idle:      "Idle",
	running:   "Scanning anime catalog",
	retrying: "Connection lost, retrying scan",
	paused:    "Paused",
	completed: "Completed",
	error:     "Failed",
};

interface PopulationMetricsProps {
	progress: PopulateAnimeDbProgressData;
	processedTotalLabel: string;
}

const PopulationMetrics: FC<PopulationMetricsProps> = ({
																												 progress,
																												 processedTotalLabel,
																											 }) => (
	<div className={ styles.metrics }>
		<Typography.Text>{ STATUS_LABELS[ progress.currentStatus ] }</Typography.Text>
		<Typography.Text type="secondary">
			Saved titles: { processedTotalLabel }
		</Typography.Text>
		{ typeof progress.lastProcessedId === "number" ? (
			<Typography.Text type="secondary">
				Last catalog ID: { progress.lastProcessedId }
			</Typography.Text>
		) : null }
		{ progress.currentStatus === "retrying" && typeof progress.autoRetryAttempt === "number" ? (
			<Typography.Text type="secondary">
				Retry attempt: { progress.autoRetryAttempt } / { progress.autoRetryMaxAttempts ?? "?" }
			</Typography.Text>
		) : null }
	</div>
);

export default PopulationMetrics;
