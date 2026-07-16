export type PixiCardShellStyle = {
	backgroundAlpha: number;
	posterAlpha: number;
	posterColor: number;
};

// Placeholder cards need a quieter shell because they are recycled pool slots,
// while real media cards should keep enough contrast for thumbnails and overlays.
export function getPixiCardShellStyle(placeholder: boolean): PixiCardShellStyle {
	return placeholder
		? {
			backgroundAlpha: 0.52,
			posterAlpha:     0.5,
			posterColor:     0x1c2541,
		}
		: {
			backgroundAlpha: 0.78,
			posterAlpha:     0.85,
			posterColor:     0x232f52,
		};
}
