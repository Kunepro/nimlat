import type { IntegrationStatus } from "@nimlat/types/anime-db";
import { useLocation } from "@tanstack/react-router";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	type MediaLayoutInspectionSnapshot,
	type MediaLayoutPatchSnapshot,
	type MediaLayoutPlaybackIssueState,
	parseMediaNavigationState,
} from "../media-layout-model";
import { useMediaLayoutInspectionSnapshot } from "./useMediaLayoutInspectionSnapshot";
import { useMediaLayoutSubscriptions } from "./useMediaLayoutSubscriptions";

interface MediaLayoutState extends MediaLayoutPlaybackIssueState {
	title: string;
	isFilm: boolean;
	hasEpisodesTab: boolean;
	groupName?: string;
	integrationPercent?: number | null;
	integrationStatus?: IntegrationStatus | null;
	setHeaderIntegrationStatus: (status: IntegrationStatus | null) => void;
	setHeaderPlaybackIssueState: (state: Partial<MediaLayoutPlaybackIssueState>) => void;
}

// Centralizes MediaLayout state so the shell header stays synchronized with
// optimistic route data, initial DB-backed inspection data, and IPC patches.
export function useMediaLayoutState(mediaId: string): MediaLayoutState {
	const { state }                                   = useLocation();
	const navigationState                             = useMemo(
		() => parseMediaNavigationState(state),
		[ state ],
	);
	const [ title, setTitle ]                           = useState(navigationState.mediaName || `Media ${ mediaId }`);
	const [ isFilm, setIsFilm ]                         = useState(Boolean(navigationState.isFilm));
	const [ hasEpisodesTab, setHasEpisodesTab ]       = useState(!navigationState.isFilm);
	const [ integrationPercent, setIntegrationPercent ] = useState<number | null>(null);
	const [ integrationStatus, setIntegrationStatus ] = useState<IntegrationStatus | null>(null);
	const [ playbackIssueState, setPlaybackIssueState ] = useState<MediaLayoutPlaybackIssueState>({
		supportsMediaPlaybackIssueMoments: Boolean(navigationState.isFilm),
	});
	const applyInspectionSnapshot = useCallback(
		(snapshot: MediaLayoutInspectionSnapshot) => {
			setTitle(snapshot.title);
			setIsFilm(snapshot.isFilm);
			setHasEpisodesTab(snapshot.hasEpisodesTab);
			setIntegrationPercent(snapshot.integrationPercent);
			setIntegrationStatus(snapshot.integrationStatus);
			setPlaybackIssueState({
				supportsMediaPlaybackIssueMoments: snapshot.supportsMediaPlaybackIssueMoments,
				playbackIssueNote:                 snapshot.playbackIssueNote,
				hasDubIssue:                       snapshot.hasDubIssue,
				hasSubIssue:                       snapshot.hasSubIssue,
				hasEncodingIssue:                  snapshot.hasEncodingIssue,
				hasAudioIssue:                     snapshot.hasAudioIssue,
				hasVideoIssue:                     snapshot.hasVideoIssue,
				playbackIssueMoments:              snapshot.playbackIssueMoments,
			});
		},
		[],
	);
	const applyPatchSnapshot      = useCallback(
		(snapshot: MediaLayoutPatchSnapshot) => {
			if (snapshot.title !== undefined) {
				setTitle(snapshot.title);
			}
			if (snapshot.isFilm !== undefined) {
				setIsFilm(snapshot.isFilm);
			}
			if (snapshot.hasEpisodesTab !== undefined) {
				setHasEpisodesTab(snapshot.hasEpisodesTab);
			}
			if ("integrationPercent" in snapshot) {
				setIntegrationPercent(snapshot.integrationPercent ?? null);
			}
			if ("integrationStatus" in snapshot) {
				setIntegrationStatus(snapshot.integrationStatus ?? null);
			}
		},
		[],
	);
	const {
					refreshInspectionSnapshot,
				}                       = useMediaLayoutInspectionSnapshot({
		mediaId,
		applyInspectionSnapshot,
	});

	useEffect(
		() => {
			if (navigationState.mediaName) {
				setTitle(navigationState.mediaName);
			}
			if (typeof navigationState.isFilm === "boolean") {
				setIsFilm(navigationState.isFilm);
				setHasEpisodesTab(!navigationState.isFilm);
			}
		},
		[
			mediaId,
			navigationState.mediaName,
			navigationState.isFilm,
		],
	);

	useMediaLayoutSubscriptions({
		mediaId,
		applyPatchSnapshot,
		refreshInspectionSnapshot,
	});

	return {
		title,
		isFilm,
		hasEpisodesTab,
		groupName: navigationState.groupName,
		integrationPercent,
		integrationStatus,
		...playbackIssueState,
		setHeaderIntegrationStatus: setIntegrationStatus,
		setHeaderPlaybackIssueState: (state) => {
			setPlaybackIssueState(current => ({
				...current,
				...state,
			}));
		},
	};
}
