import type { BackgroundStyle } from "@nimlat/types/user-config";
import type { PixiBackgroundDiagnostics } from "../../types/pixi-background";

export interface BackgroundDiagnosticsSnapshot {
	style: BackgroundStyle;
	hostWidth: number;
	hostHeight: number;
	rendererWidth: number;
	rendererHeight: number;
	resolution: number;
	lastFrameMs: number;
	resizeCount: number;
	layer: PixiBackgroundDiagnostics | null;
}
