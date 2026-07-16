import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useGroupsShellHeader } from "../../groups/groups-shell/use-groups-shell-header";
import MediaHeaderTrackingProjector from "../components/MediaHeaderTrackingProjector";
import type { MediaLayoutPlaybackIssueState } from "../media-layout-model";
import MediaProgressionHeader from "../MediaProgressionHeader";
import { useMediaHeaderMutations } from "./useMediaHeaderMutations";

interface UseMediaLayoutHeaderInput extends MediaLayoutPlaybackIssueState {
	integrationPercent?: number | null;
	integrationStatus?: IntegrationStatus | null;
	mediaId: string;
	onBack: () => void;
	setHeaderIntegrationStatus: (status: IntegrationStatus | null) => void;
	setHeaderPlaybackIssueState: (state: Partial<MediaLayoutPlaybackIssueState>) => void;
	title: string;
}

// Wires the media shell header to DB-backed integration mutations. The visible
// header is shared, but media-specific save semantics stay local to this hook.
export function useMediaLayoutHeader({
																			 hasAudioIssue,
																			 hasDubIssue,
																			 hasEncodingIssue,
																			 hasSubIssue,
																			 hasVideoIssue,
																			 integrationPercent,
																			 integrationStatus,
																			 mediaId,
																			 onBack,
																			 playbackIssueMoments,
																			 playbackIssueNote,
																			 setHeaderIntegrationStatus,
																			 setHeaderPlaybackIssueState,
																			 supportsMediaPlaybackIssueMoments,
																			 title,
																		 }: UseMediaLayoutHeaderInput): void {
	const {
					handleHeaderPlaybackIssueSave,
					handleHeaderTrackingStatusChange,
				} = useMediaHeaderMutations({
		mediaId,
		setHeaderIntegrationStatus,
		setHeaderPlaybackIssueState,
	});

	const headerCenterContent = useMemo<ReactNode>(
		() => (
			<MediaHeaderTrackingProjector
				mediaId={ mediaId }
				integrationStatus={ integrationStatus }
				supportsMediaPlaybackIssueMoments={ supportsMediaPlaybackIssueMoments }
				playbackIssueNote={ playbackIssueNote }
				hasDubIssue={ hasDubIssue }
				hasSubIssue={ hasSubIssue }
				hasEncodingIssue={ hasEncodingIssue }
				hasAudioIssue={ hasAudioIssue }
				hasVideoIssue={ hasVideoIssue }
				playbackIssueMoments={ playbackIssueMoments }
				onPlaybackIssueSave={ handleHeaderPlaybackIssueSave }
				onTrackingStatusChange={ handleHeaderTrackingStatusChange }
			/>
		),
		[
			handleHeaderPlaybackIssueSave,
			handleHeaderTrackingStatusChange,
			hasAudioIssue,
			hasDubIssue,
			hasEncodingIssue,
			hasSubIssue,
			hasVideoIssue,
			integrationStatus,
			mediaId,
			playbackIssueMoments,
			playbackIssueNote,
			supportsMediaPlaybackIssueMoments,
		],
	);

	const headerRightContent = useMemo<ReactNode>(
		() => (
			<MediaProgressionHeader
				integrationPercent={ integrationPercent }
				integrationStatus={ integrationStatus }
			/>
		),
		[
			integrationPercent,
			integrationStatus,
		],
	);

	useGroupsShellHeader({
		title,
		onBack,
		centerContent: headerCenterContent,
		rightContent:  headerRightContent,
	});
}
