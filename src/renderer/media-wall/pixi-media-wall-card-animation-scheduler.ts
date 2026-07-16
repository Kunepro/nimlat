import { cancelMediaWallAnimationFrame } from "./pixi-media-wall-renderer-runtime";

interface PixiMediaWallCardAnimationSchedulerOptions {
	render: () => void;
}

// Schedules follow-up renders while card transition animations are active.
// Keeping RAF ownership here prevents renderer teardown paths from forgetting
// to cancel or dedupe animation frames.
export class PixiMediaWallCardAnimationScheduler {
	private readonly render: () => void;
	private renderRaf: number | null = null;

	public constructor({
											 render,
										 }: PixiMediaWallCardAnimationSchedulerOptions) {
		this.render = render;
	}

	public requestNextFrame(hasActiveAnimation: boolean): void {
		if (!hasActiveAnimation) {
			return;
		}
		if (this.renderRaf !== null) {
			return;
		}
		if (typeof requestAnimationFrame !== "function") {
			this.render();
			return;
		}

		this.renderRaf = requestAnimationFrame(() => {
			this.renderRaf = null;
			this.render();
		});
	}

	public cancel(): void {
		this.renderRaf = cancelMediaWallAnimationFrame(this.renderRaf);
	}
}
