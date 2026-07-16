import type { BackgroundStyle } from "@nimlat/types/user-config";
import type {
	Application,
	Container,
} from "pixi.js";
import type { PixiBackgroundLayer } from "../../../types/pixi-background";

import { KanaGridBackgroundLayer } from "./kana-grid-background-layer";
import { KanaMatrixBackgroundLayer } from "./kana-matrix-background-layer";
import { StaticDarkBlueBackgroundLayer } from "./static-dark-blue-background-layer";
import { SynthwaveBackgroundLayer } from "./synthwave-background-layer";

export function createPixiBackgroundLayer(style: BackgroundStyle, app: Application, stage: Container): PixiBackgroundLayer {
	if (style === "staticDarkBlue") {
		return new StaticDarkBlueBackgroundLayer(stage);
	}

	if (style === "kanaMatrix") {
		return new KanaMatrixBackgroundLayer(
			app,
			stage,
		);
	}

	if (style === "kanaGrid") {
		return new KanaGridBackgroundLayer(stage);
	}

	return new SynthwaveBackgroundLayer(stage);
}
