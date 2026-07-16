export interface MediaWallRangeRequest {
	offset: number;
	limit: number;
	search: string;
}

export interface MediaWallLoadedRange<TItem> {
	offset: number;
	total: number;
	items: TItem[];
}
