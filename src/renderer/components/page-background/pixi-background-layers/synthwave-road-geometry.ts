import type {
	BackgroundSize,
	SynthwaveRoadGeometry,
} from "../../../types/pixi-background";

export function createSynthwaveRoadGeometry(size: BackgroundSize): SynthwaveRoadGeometry {
	return {
		horizonY:       heightToSynthwaveHorizonY(size.height),
		centerX:        size.width * 0.5,
		roadTopHalf:    size.width * 0.0275,
		roadBottomHalf: size.width * 0.21,
	};
}

function heightToSynthwaveHorizonY(height: number): number {
	return height * 0.58;
}
