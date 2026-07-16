export interface BackgroundSize {
	width: number;
	height: number;
}

export interface PixiBackgroundDiagnostics {
	layerName: string;
	width: number;
	height: number;
	objectCount: number;
	detail: string;
}

export interface PixiBackgroundLayer {
	readonly isAnimated?: boolean;

	resize(size: BackgroundSize): void;

	update(elapsedMs: number, deltaMs: number): void;

	getDiagnostics?(): PixiBackgroundDiagnostics;

	destroy(): void;
}

export interface SynthwaveRoadGeometry {
	horizonY: number;
	centerX: number;
	roadTopHalf: number;
	roadBottomHalf: number;
}
