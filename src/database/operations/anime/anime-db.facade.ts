import { AnimeDbGroupFacade } from "./anime-db-group.facade";
import { AnimeDbHydrationFacade } from "./anime-db-hydration.facade";
import { AnimeDbMediaFacade } from "./anime-db-media.facade";
import { AnimeDbMetadataFacade } from "./anime-db-metadata.facade";
import { AnimeDbPeopleFacade } from "./anime-db-people.facade";
import { AnimeDbScanStateFacade } from "./anime-db-scan-state.facade";

// Central AnimeDB control panel. Keep this class as a compatibility index only:
// domain behavior belongs in operations/services, and panel files own the logged DB boundary.
export class AnimeDbFacade {
	public static metadata = AnimeDbMetadataFacade;

	public static group = AnimeDbGroupFacade;

	public static scanState = AnimeDbScanStateFacade;

	public static media = AnimeDbMediaFacade;

	public static hydration = AnimeDbHydrationFacade;

	public static people = AnimeDbPeopleFacade;

	public static getGroupCharactersQueueCount = AnimeDbHydrationFacade.getGroupCharactersQueueCount;

	public static getStaffQueueCount = AnimeDbHydrationFacade.getStaffQueueCount;

	public static getGroupJikanEpisodesQueueCount = AnimeDbHydrationFacade.getGroupJikanEpisodesQueueCount;

	public static getJikanEpisodeThumbnailsQueueCount = AnimeDbHydrationFacade.getJikanEpisodeThumbnailsQueueCount;

	public static getNextGroupJikanEpisodesRetryAt = AnimeDbHydrationFacade.getNextGroupJikanEpisodesRetryAt;

	public static getNextJikanEpisodeThumbnailsRetryAt = AnimeDbHydrationFacade.getNextJikanEpisodeThumbnailsRetryAt;

	public static getMediasFromGroupCharactersQueue = AnimeDbHydrationFacade.getMediasFromGroupCharactersQueue;

	public static getMediasFromStaffQueue = AnimeDbHydrationFacade.getMediasFromStaffQueue;

	public static getMediasFromGroupJikanEpisodesQueue = AnimeDbHydrationFacade.getMediasFromGroupJikanEpisodesQueue;

	public static getMediasFromJikanEpisodeThumbnailsQueue = AnimeDbHydrationFacade.getMediasFromJikanEpisodeThumbnailsQueue;

	public static deleteFromGroupCharactersQueue = AnimeDbHydrationFacade.deleteFromGroupCharactersQueue;

	public static deleteFromStaffQueue = AnimeDbHydrationFacade.deleteFromStaffQueue;

	public static deleteFromGroupJikanEpisodesQueue = AnimeDbHydrationFacade.deleteFromGroupJikanEpisodesQueue;

	public static deleteFromJikanEpisodeThumbnailsQueue = AnimeDbHydrationFacade.deleteFromJikanEpisodeThumbnailsQueue;

	public static markGroupCharactersQueueProcessing = AnimeDbHydrationFacade.markGroupCharactersQueueProcessing;

	public static markStaffQueueProcessing = AnimeDbHydrationFacade.markStaffQueueProcessing;

	public static markGroupJikanEpisodesQueueProcessing = AnimeDbHydrationFacade.markGroupJikanEpisodesQueueProcessing;

	public static markJikanEpisodeThumbnailsQueueProcessing = AnimeDbHydrationFacade.markJikanEpisodeThumbnailsQueueProcessing;

	public static enqueueGroupJikanEpisodesQueue = AnimeDbHydrationFacade.enqueueGroupJikanEpisodesQueue;

	public static enqueueJikanEpisodeThumbnailsQueue = AnimeDbHydrationFacade.enqueueJikanEpisodeThumbnailsQueue;

	public static updateFailedGroupCharactersQueue = AnimeDbHydrationFacade.updateFailedGroupCharactersQueue;

	public static updateFailedStaffQueue = AnimeDbHydrationFacade.updateFailedStaffQueue;

	public static updateFailedGroupJikanEpisodesQueue = AnimeDbHydrationFacade.updateFailedGroupJikanEpisodesQueue;

	public static updateFailedJikanEpisodeThumbnailsQueue = AnimeDbHydrationFacade.updateFailedJikanEpisodeThumbnailsQueue;

	public static markFailedGroupJikanEpisodesQueue = AnimeDbHydrationFacade.markFailedGroupJikanEpisodesQueue;

	public static markFailedJikanEpisodeThumbnailsQueue = AnimeDbHydrationFacade.markFailedJikanEpisodeThumbnailsQueue;

	public static getMediaEpisodeUpdatesIssue = AnimeDbHydrationFacade.getMediaEpisodeUpdatesIssue;

	public static getMediaEpisodeUpdatesSupportFacts = AnimeDbHydrationFacade.getMediaEpisodeUpdatesSupportFacts;

	public static retryMediaEpisodeUpdates = AnimeDbHydrationFacade.retryMediaEpisodeUpdates;

	public static listErroredContent = AnimeDbHydrationFacade.listErroredContent;

	public static getErroredContent = AnimeDbHydrationFacade.getErroredContent;

	public static retryErroredContent = AnimeDbHydrationFacade.retryErroredContent;

	public static retryAllErroredContent = AnimeDbHydrationFacade.retryAllErroredContent;

	public static hideErroredContent = AnimeDbHydrationFacade.hideErroredContent;

	public static getMediaEpisodeUpdatesQueueStatus = AnimeDbHydrationFacade.getMediaEpisodeUpdatesQueueStatus;

	public static hasMediaEpisodeUpdatesManualPriority = AnimeDbHydrationFacade.hasMediaEpisodeUpdatesManualPriority;

	public static getOrCreateJikanEpisodesSyncState = AnimeDbHydrationFacade.getOrCreateJikanEpisodesSyncState;

	public static upsertJikanEpisodesStagingPage = AnimeDbHydrationFacade.upsertJikanEpisodesStagingPage;

	public static applyJikanEpisodeVideoThumbnailsToStagingPage = AnimeDbHydrationFacade.applyJikanEpisodeVideoThumbnailsToStagingPage;

	public static applyJikanEpisodeVideoThumbnailsToEpisodesPage = AnimeDbHydrationFacade.applyJikanEpisodeVideoThumbnailsToEpisodesPage;

	public static getNextJikanEpisodeSynopsisCandidate = AnimeDbHydrationFacade.getNextJikanEpisodeSynopsisCandidate;

	public static applyJikanEpisodeSynopsisToStagingEpisode = AnimeDbHydrationFacade.applyJikanEpisodeSynopsisToStagingEpisode;

	public static clearJikanEpisodeThumbnailsForMedia = AnimeDbHydrationFacade.clearJikanEpisodeThumbnailsForMedia;

	public static getJikanEpisodeThumbnailsQueueEntry = AnimeDbHydrationFacade.getJikanEpisodeThumbnailsQueueEntry;

	public static updateJikanEpisodeThumbnailsProgress = AnimeDbHydrationFacade.updateJikanEpisodeThumbnailsProgress;

	public static updateJikanEpisodesSyncEpisodesProgress = AnimeDbHydrationFacade.updateJikanEpisodesSyncEpisodesProgress;

	public static updateJikanEpisodesSyncSynopsisProgress = AnimeDbHydrationFacade.updateJikanEpisodesSyncSynopsisProgress;

	public static finalizeJikanEpisodesSync = AnimeDbHydrationFacade.finalizeJikanEpisodesSync;

	public static clearJikanEpisodesSyncState = AnimeDbHydrationFacade.clearJikanEpisodesSyncState;

	public static getMediaName = AnimeDbHydrationFacade.getMediaName;

	public static getMediaMalId = AnimeDbHydrationFacade.getMediaMalId;

	public static hasGroupCharactersQueueEntries = AnimeDbHydrationFacade.hasGroupCharactersQueueEntries;

	public static hasStaffQueueEntries = AnimeDbHydrationFacade.hasStaffQueueEntries;

	public static hasGroupJikanEpisodesQueueEntries = AnimeDbHydrationFacade.hasGroupJikanEpisodesQueueEntries;

	public static hasJikanEpisodeThumbnailsQueueEntries = AnimeDbHydrationFacade.hasJikanEpisodeThumbnailsQueueEntries;

	public static processCharactersBatch = AnimeDbPeopleFacade.processCharactersBatch;

	public static processStaffBatch = AnimeDbPeopleFacade.processStaffBatch;

	public static getCharacterInspection = AnimeDbPeopleFacade.getCharacterInspection;

	public static getVoiceActorInspection = AnimeDbPeopleFacade.getVoiceActorInspection;

	public static getStaffInspection = AnimeDbPeopleFacade.getStaffInspection;

	public static updateGroupDetails = AnimeDbGroupFacade.updateDetails;

	public static deleteGroup = AnimeDbGroupFacade.deleteGroup;

	public static insertCharacter = AnimeDbPeopleFacade.insertCharacter;

	public static insertMediaCharacter = AnimeDbPeopleFacade.insertMediaCharacter;
}
