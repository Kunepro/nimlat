type CharacterImage = {
	large?: string | null;
	medium?: string | null;
};

// AniList character images are stored as raw provider JSON so ingestion can stay
// lightweight; read paths collapse that provider shape to one renderer URL.
export function resolveCharacterImageUrl(imageJson: string | null): string | undefined {
	if (!imageJson) {
		return undefined;
	}

	try {
		const image = JSON.parse(imageJson) as CharacterImage | null;
		return image?.large || image?.medium || undefined;
	} catch {
		return undefined;
	}
}
