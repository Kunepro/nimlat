import { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";
import {
	useEffect,
	useMemo,
	useState,
} from "react";
import type { PopulationActionPendingState } from "../../../types/populate-anime-db";
import {
	loadPopulationDevModeStatus,
	loadPopulationStatus,
	populationProgressChanges,
	restartAnimeDbPopulation,
	startAnimeDbPopulation,
	stopAnimeDbPopulation,
} from "../populate-anime-db-runner";

const DEFAULT_PROGRESS: PopulateAnimeDbProgressData = {
	currentPage:             1,
	requestBatch: 0,
	totalPages:              null,
	processedMedias:         0,
	totalMedias:             null,
	totalMediasIsLowerBound: false,
	currentStatus:           "idle",
};

interface PopulationProgressSummary {
	progressPercent: number;
	processedTotalLabel: string;
	progressStatus: "active" | "exception" | "success";
}

function getProgressStatus(currentStatus: PopulateAnimeDbProgressData["currentStatus"]): PopulationProgressSummary["progressStatus"] {
	if (currentStatus === "error") {
		return "exception";
	}

	return currentStatus === "completed" ? "success" : "active";
}

function getProgressPercent(progress: PopulateAnimeDbProgressData): number {
	if (!progress.totalMedias || progress.totalMedias <= 0) {
		return 0;
	}

	const percent = Math.min(
		100,
		Math.max(
			0,
			Math.round((progress.processedMedias / progress.totalMedias) * 100),
		),
	);

	// AniList totals can be lower bounds while pagination continues; still show useful progress without implying completion.
	if (progress.totalMediasIsLowerBound && progress.currentStatus !== "completed") {
		return Math.min(
			99,
			percent,
		);
	}

	return percent;
}

function getProcessedTotalLabel(progress: PopulateAnimeDbProgressData): string {
	return progress.totalMedias
		? `${ progress.processedMedias } / ${ progress.totalMedias }${ progress.totalMediasIsLowerBound ? "+" : "" }`
		: `${ progress.processedMedias }`;
}

export function usePopulationProgress(): PopulateAnimeDbProgressData {
	const [ progress, setProgress ] = useState<PopulateAnimeDbProgressData>(DEFAULT_PROGRESS);

	useEffect(
		() => {
			const progressSubscription = populationProgressChanges().subscribe(setProgress);

			void loadPopulationStatus().then(setProgress);

			return () => {
				progressSubscription.unsubscribe();
			};
		},
		[],
	);

	return progress;
}

export function useDevModeFlag(): boolean {
	const [ isDevMode, setDevMode ] = useState(false);

	useEffect(
		() => {
			void loadPopulationDevModeStatus()
				.then(setDevMode)
				.catch(() => setDevMode(false));
		},
		[],
	);

	return isDevMode;
}

export function usePopulationProgressSummary(progress: PopulateAnimeDbProgressData): PopulationProgressSummary {
	return useMemo(
		() => ({
			progressPercent:     getProgressPercent(progress),
			processedTotalLabel: getProcessedTotalLabel(progress),
			progressStatus:      getProgressStatus(progress.currentStatus),
		}),
		[
			progress,
		],
	);
}

export function usePopulationActions(): {
	uiError: string | null;
	pendingAction: PopulationActionPendingState;
	handleStart: () => Promise<void>;
	handleStop: () => Promise<void>;
	handleRestart: () => Promise<void>;
} {
	const [ uiError, setUiError ]             = useState<string | null>(null);
	const [ pendingAction, setPendingAction ] = useState<PopulationActionPendingState>(null);

	const handleStart = async () => {
		setUiError(null);
		setPendingAction("starting");
		try {
			const result = await startAnimeDbPopulation();
			if (!result.success) {
				setUiError(result.error);
			}
		} finally {
			setPendingAction(null);
		}
	};

	const handleStop = async () => {
		setUiError(null);
		setPendingAction("pausing");
		try {
			const result = await stopAnimeDbPopulation();
			if (!result.success) {
				setUiError(result.error);
			}
		} finally {
			setPendingAction(null);
		}
	};

	const handleRestart = async () => {
		setUiError(null);
		setPendingAction("restarting");
		try {
			const result = await restartAnimeDbPopulation();
			if (!result.success) {
				setUiError(result.error);
			}
		} finally {
			setPendingAction(null);
		}
	};

	return {
		uiError,
		pendingAction,
		handleStart,
		handleStop,
		handleRestart,
	};
}
