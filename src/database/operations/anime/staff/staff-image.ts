type StaffImage = {
	large?: string | null;
	medium?: string | null;
};

export function resolveStaffImageUrl(imageJson: string | null): string | undefined {
	if (!imageJson) {
		return undefined;
	}

	try {
		const image = JSON.parse(imageJson) as StaffImage | null;
		return image?.large || image?.medium || undefined;
	} catch {
		return undefined;
	}
}
