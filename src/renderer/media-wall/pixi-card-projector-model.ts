import type { PixiCardRenderState } from "./pixi-card-renderer-types";

export type PixiCardProjectorState = {
	laserIntensity: number;
	lightIntensity: number;
};

// Projector light is a hover affordance only when visual effects are enabled;
// keeping the policy pure keeps the Pixi renderer from owning interaction rules.
export function getPixiCardProjectorState(state: PixiCardRenderState): PixiCardProjectorState {
	const lightIntensity = state.effectsEnabled && state.projectorHovered
		? 1
		: 0;

	return {
		laserIntensity: lightIntensity > 0 ? 1 : 0,
		lightIntensity,
	};
}
