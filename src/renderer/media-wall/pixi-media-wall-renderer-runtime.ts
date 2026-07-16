// Installs Pixi's CSP-safe shader/uniform polyfills before any renderer is initialized.
import "pixi.js/unsafe-eval";
import {
	Application,
	Container,
} from "pixi.js";
import type { MediaWallSize } from "../types/media-wall";

export interface PixiMediaWallLayers {
	wall: Container;
	effects: Container;
}

const PIXI_APPLICATION_DESTROY_OPTIONS = {
	removeView: true,
} as const;

const PIXI_APPLICATION_RESOURCE_DESTROY_OPTIONS = {
	children:      true,
	texture:       true,
	textureSource: true,
	context:       true,
} as const;

export async function createPixiMediaWallApplication(size: MediaWallSize): Promise<Application> {
	const app = new Application();
	await app.init({
		autoStart:         false,
		backgroundAlpha:   0,
		clearBeforeRender: true,
		resolution:        1,
		autoDensity:       true,
		antialias:         true,
		width:             Math.max(
			1,
			size.width,
		),
		height:            Math.max(
			1,
			size.height,
		),
	});
	return app;
}

export function createPixiMediaWallLayers(app: Application): PixiMediaWallLayers {
	const wall    = new Container();
	const effects = new Container();
	app.stage.addChild(
		wall,
		effects,
	);
	return {
		wall,
		effects,
	};
}

export function attachPixiMediaWallCanvas(container: HTMLElement, canvas: Application["canvas"]): void {
	canvas.style.display       = "block";
	canvas.style.width         = "100%";
	canvas.style.height        = "100%";
	canvas.style.pointerEvents = "none";
	container.appendChild(canvas);
}

export function cancelMediaWallAnimationFrame(frameId: number | null): null {
	if (frameId !== null && typeof cancelAnimationFrame === "function") {
		cancelAnimationFrame(frameId);
	}
	return null;
}

export function destroyPixiApplicationSafely(app: Application | null): void {
	if (!app) {
		return;
	}

	try {
		app.destroy(
			PIXI_APPLICATION_DESTROY_OPTIONS,
			PIXI_APPLICATION_RESOURCE_DESTROY_OPTIONS,
		);
	} catch {
		// Pixi teardown can throw after a failed or lost graphics context; callers still
		// need React unmounts and route transitions to complete.
	}
}
