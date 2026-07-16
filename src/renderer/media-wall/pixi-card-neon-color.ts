export const NEON_BORDER_COLOR   = 0xb4eeff;
export const WATCHED_GREEN_COLOR = 0x47ff8a;

const RARE_NEON_COLORS       = [
	0x00ff22, // green
	0x0022ff, // blue
	0xff0000, // red
] as const;
const MACE_PURPLE_NEON_COLOR = 0x990099;

function hashStringToUint32(value: string): number {
	let hash = 2166136261;

	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(
			hash,
			16777619,
		);
	}

	return hash >>> 0;
}

export function resolveItemNeonColor(itemKey: string): number {
	const hash = hashStringToUint32(itemKey);
	if (hash % 100 === 0) {
		return MACE_PURPLE_NEON_COLOR;
	}
	if (hash % 50 === 0) {
		return RARE_NEON_COLORS[ hash % RARE_NEON_COLORS.length ] ?? NEON_BORDER_COLOR;
	}
	return NEON_BORDER_COLOR;
}
