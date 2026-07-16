export type PixiCardLitNeonGlowStyle = {
	coreBloomAlpha: number;
	coreWidth: number;
	glassHighlightAlpha: number;
	innerTubeBloomAlpha: number;
	outerBloomAlpha: number;
	sideBloomAlpha: number;
	tallBloomAlpha: number;
	visible: boolean;
	wideBloomAlpha: number;
};

// The lit border uses several translucent passes instead of one heavy stroke so
// the card keeps a physical neon-tube edge without washing out thumbnails.
export function getPixiCardLitNeonGlowStyle(neonIntensity: number, focused: boolean): PixiCardLitNeonGlowStyle {
	if (neonIntensity <= 0) {
		return {
			coreBloomAlpha:      0,
			coreWidth:           2,
			glassHighlightAlpha: 0.07,
			innerTubeBloomAlpha: 0,
			outerBloomAlpha:     0,
			sideBloomAlpha:      0,
			tallBloomAlpha:      0,
			visible:             false,
			wideBloomAlpha:      0,
		};
	}

	const glowAlpha = 0.015 + ((focused ? 0.56 : 0.64) * neonIntensity);

	return {
		coreBloomAlpha:      glowAlpha * 0.76,
		coreWidth:           16,
		glassHighlightAlpha: 0.26,
		innerTubeBloomAlpha: 0.18 * neonIntensity,
		outerBloomAlpha:     0.08 * neonIntensity,
		sideBloomAlpha:      0.062 * neonIntensity,
		tallBloomAlpha:      0.038 * neonIntensity,
		visible:             true,
		wideBloomAlpha:      0.052 * neonIntensity,
	};
}
