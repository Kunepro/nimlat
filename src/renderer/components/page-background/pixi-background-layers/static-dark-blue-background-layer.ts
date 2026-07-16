import {
	Container,
	Graphics,
} from "pixi.js";

import type {
	BackgroundSize,
	PixiBackgroundDiagnostics,
	PixiBackgroundLayer,
} from "../../../types/pixi-background";

export class StaticDarkBlueBackgroundLayer implements PixiBackgroundLayer {
	public readonly isAnimated = false;

	private readonly background = new Graphics();

	public constructor(stage: Container) {
		stage.addChild(this.background);
	}

	public resize(size: BackgroundSize): void {
		// Single-fill diagnostic background; no animation or layered geometry by design.
		this.background
			.clear()
			.rect(
				0,
				0,
				size.width,
				size.height,
			)
			.fill({
				color: 0x061329,
				alpha: 1,
			});
	}

	public update(): void {
	}

	public getDiagnostics(): PixiBackgroundDiagnostics {
		return {
			layerName:   "staticDarkBlue",
			width:       this.background.width,
			height:      this.background.height,
			objectCount: 1,
			detail:      "static",
		};
	}

	public destroy(): void {
		this.background.destroy();
	}
}
