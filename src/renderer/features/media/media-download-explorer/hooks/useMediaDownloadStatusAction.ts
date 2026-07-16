import type {
	Dispatch,
	SetStateAction,
} from "react";
import {
	useCallback,
	useState,
} from "react";
import type { MediaDownloadInspection } from "../../../../types/media-download";
import {
	applyMediaDownloadIntegrationStatus,
	formatMediaDownloadActionError,
} from "../media-download-action-model";
import { markMediaDownloadStatusDownloading } from "../media-download-explorer-runner";

interface MediaDownloadStatusAction {
	isSettingDownloading: boolean;
	setMediaDownloading: () => Promise<void>;
}

export function useMediaDownloadStatusAction(
	numericMediaId: number,
	setMedia: Dispatch<SetStateAction<MediaDownloadInspection>>,
	setActionError: Dispatch<SetStateAction<string | null>>,
): MediaDownloadStatusAction {
	const [ isSettingDownloading, setSettingDownloading ] = useState(false);

	const setMediaDownloading = useCallback(
		async () => {
			try {
				setActionError(null);
				setSettingDownloading(true);
				await markMediaDownloadStatusDownloading(numericMediaId);
				setMedia((current) => applyMediaDownloadIntegrationStatus(
					current,
					"downloading",
				));
			} catch (error) {
				setActionError(formatMediaDownloadActionError(
					error,
					"Failed to mark media as downloading.",
				));
			} finally {
				setSettingDownloading(false);
			}
		},
		[
			numericMediaId,
			setActionError,
			setMedia,
		],
	);

	return {
		isSettingDownloading,
		setMediaDownloading,
	};
}
