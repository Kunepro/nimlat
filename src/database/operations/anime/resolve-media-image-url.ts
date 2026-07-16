type CoverImage = {
	extraLarge?: string | null;
	large?: string | null;
	medium?: string | null;
};

// Media cover JSON comes from provider payloads; read models collapse it to the
// best renderer URL while preserving custom image overrides and banner fallback.
export function resolveAnimeMediaImageUrl(
	customImageUrl: string | null,
	coverImageJson: string | null,
	bannerImage: string | null,
): string | undefined {
	if (customImageUrl) {
		return customImageUrl;
	}
	if (!coverImageJson) {
		return bannerImage || undefined;
	}

	try {
		const coverImage = JSON.parse(coverImageJson) as CoverImage;
		return coverImage.extraLarge || coverImage.large || coverImage.medium || bannerImage || undefined;
	} catch {
		return bannerImage || undefined;
	}
}
