import { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";
import {
	Button,
	Space,
} from "antd";
import { FC } from "react";
import type { PopulationActionPendingState } from "../../../types/populate-anime-db";

interface PopulationActionsProps {
	progress: PopulateAnimeDbProgressData;
	pendingAction: PopulationActionPendingState;
	isDevMode: boolean;
	onStart: () => void;
	onStop: () => void;
	onRestart: () => void;
}

function getStartButtonLabel(progress: PopulateAnimeDbProgressData): string {
	if (progress.currentStatus === "paused") {
		return "Resume Scan";
	}

	return progress.processedMedias > 0 || typeof progress.lastProcessedId === "number"
		? "Continue Scan"
		: "Start Scan";
}

const PopulationActions: FC<PopulationActionsProps> = ({
																												 progress,
																												 isDevMode,
																												 pendingAction,
																												 onStart,
																												 onStop,
																												 onRestart,
																											 }) => {
	const isRunning = progress.currentStatus === "running" || progress.currentStatus === "retrying";
	const hasPendingAction = pendingAction !== null;

	return (
		<Space wrap>
			<Button
				type="primary"
				onClick={ onStart }
				disabled={ isRunning || hasPendingAction }
				loading={ pendingAction === "starting" }
			>
				{ pendingAction === "starting" ? "Starting..." : getStartButtonLabel(progress) }
			</Button>
			<Button
				onClick={ onStop }
				disabled={ !isRunning || hasPendingAction }
				loading={ pendingAction === "pausing" }
			>
				{ pendingAction === "pausing" ? "Pausing..." : "Pause" }
			</Button>
			{ isDevMode ? (
				<Button
					danger
					onClick={ onRestart }
					disabled={ isRunning || hasPendingAction }
					loading={ pendingAction === "restarting" }
				>
					{ pendingAction === "restarting" ? "Restarting..." : "Restart From Scratch" }
				</Button>
			) : null }
			<Button
				onClick={ () => window.history.back() }
				disabled={ hasPendingAction }
			>
				Back
			</Button>
		</Space>
	);
};

export default PopulationActions;
