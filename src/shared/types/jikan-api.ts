export interface JikanEpisode {
	mal_id: number; // The episode number, nothing to do with mal or id
	url: string | null;
	title: string;
	title_japanese: string | null;
	title_romanji: string | null;
	synopsis?: string | null;
	duration?: number | null;
	aired: string | null;
	score: number | null;
	filler: boolean;
	recap: boolean;
	forum_url: string | null;
}

export interface JikanPagination {
	last_visible_page: number;
	has_next_page: boolean;
}

export interface JikanResponse {
	pagination: JikanPagination;
	data: JikanEpisode[];
}

export interface JikanEpisodeDetailsResponse {
	data: JikanEpisode;
}

export interface JikanEpisodeVideo {
	mal_id: number;
	episode: string | null;
	title: string | null;
	url: string | null;
	images?: {
		jpg?: {
			image_url?: string | null;
		};
	};
}

export interface JikanEpisodeVideosResponse {
	pagination: JikanPagination;
	data: JikanEpisodeVideo[];
}
