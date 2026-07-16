import type { MediaId } from "./nimlat-ids";

export interface UpdateMediaDetailsRequest {
	mediaId: MediaId;
	name: string;
	description?: string;
}

export interface ResetMediaDetailsRequest {
	mediaId: MediaId;
}

export type MediaUpdateDetailsActionResult =
	| { success: true }
	| { success: false; error: string };

export interface UpdateEpisodeDetailsRequest {
	mediaId: MediaId;
	episodeNumber: number;
	name?: string;
	description?: string;
}

export interface ResetEpisodeDetailsRequest {
	mediaId: MediaId;
	episodeNumber: number;
}

export type EpisodeUpdateDetailsActionResult =
	| { success: true }
	| { success: false; error: string };

export type MediaRefreshActionResult =
	| { success: true }
	| { success: false; error: string };
