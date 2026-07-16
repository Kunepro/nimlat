// Installs Pixi's CSP-safe shader/uniform polyfills before any background renderer is initialized.
import "pixi.js/unsafe-eval";
import type { BackgroundStyle } from "@nimlat/types/user-config";
import {
	Application,
	Container,
} from "pixi.js";
import type { RefObject } from "react";
import { useEffect } from "react";
import type { PixiBackgroundLayer } from "../../../types/pixi-background";
import type { BackgroundDiagnosticsSnapshot } from "../pixi-app-background-types";
import { createPixiBackgroundLayer } from "../pixi-background-layers";

interface PixiBackgroundRendererDiagnostics {
	diagnosticsEnabledRef: RefObject<boolean>;
	publishDiagnosticsSnapshot: (now: number, snapshot: BackgroundDiagnosticsSnapshot) => void;
}

interface PixiBackgroundRendererOptions {
	backgroundStyle: BackgroundStyle;
	canvasHostRef: RefObject<HTMLDivElement | null>;
	diagnostics: PixiBackgroundRendererDiagnostics;
}

export function usePixiBackgroundRenderer({
																						backgroundStyle,
																						canvasHostRef,
																						diagnostics,
																					}: PixiBackgroundRendererOptions): void {
	useEffect(
		() => {
			const host = canvasHostRef.current;
			if (!host) {
				return undefined;
			}

			let cancelled                             = false;
			let animationFrameId: number | null       = null;
			let resizeObserver: ResizeObserver | null = null;
			let app: Application | null               = null;
			let layer: PixiBackgroundLayer | null     = null;
			const stage                               = new Container();
			const startedAt                           = performance.now();
			let lastFrameAt                           = startedAt;
			let resizeCount                           = 0;

			const updateDiagnostics = (now: number, deltaMs: number) => {
				if (!diagnostics.diagnosticsEnabledRef.current || !app || !layer) {
					return;
				}
				diagnostics.publishDiagnosticsSnapshot(
					now,
					{
						style:          backgroundStyle,
						hostWidth:      host.clientWidth,
						hostHeight:     host.clientHeight,
						rendererWidth:  app.renderer.width,
						rendererHeight: app.renderer.height,
						resolution:     app.renderer.resolution,
						lastFrameMs:    deltaMs,
						resizeCount,
						layer:          layer.getDiagnostics?.() ?? null,
					},
				);
			};

			const renderFrame = (now: number) => {
				if (cancelled || !app || !layer) {
					return;
				}

				const deltaMs = document.hidden
					? 0
					: Math.min(
						64,
						now - lastFrameAt,
					);
				lastFrameAt   = now;

				if (!document.hidden) {
					layer.update(
						now - startedAt,
						deltaMs,
					);
					app.render();
					updateDiagnostics(
						now,
						deltaMs,
					);
				}

				animationFrameId = layer.isAnimated === false
					? null
					: window.requestAnimationFrame(renderFrame);
			};

			const resize = () => {
				if (!app || !layer) {
					return;
				}

				const nextSize = {
					width:  Math.max(
						1,
						Math.floor(host.clientWidth),
					),
					height: Math.max(
						1,
						Math.floor(host.clientHeight),
					),
				};
				app.renderer.resize(
					nextSize.width,
					nextSize.height,
					1,
				);
				resizeCount += 1;
				layer.resize(nextSize);
				app.render();
				updateDiagnostics(
					performance.now(),
					0,
				);
			};

			const mount = async () => {
				const pixiApp = new Application();
				await pixiApp.init({
					autoStart:         false,
					backgroundAlpha:   0,
					clearBeforeRender: true,
					resolution:        1,
					autoDensity:       true,
					antialias:         true,
					width:             Math.max(
						1,
						host.clientWidth,
					),
					height:            Math.max(
						1,
						host.clientHeight,
					),
				});

				if (cancelled) {
					destroyPixiApp(pixiApp);
					return;
				}

				pixiApp.stage.addChild(stage);
				pixiApp.canvas.style.display = "block";
				host.appendChild(pixiApp.canvas);

				app   = pixiApp;
				layer = createPixiBackgroundLayer(
					backgroundStyle,
					pixiApp,
					stage,
				);
				resize();

				resizeObserver = new ResizeObserver(resize);
				resizeObserver.observe(host);
				animationFrameId = layer.isAnimated === false
					? null
					: window.requestAnimationFrame(renderFrame);
			};

			void mount();

			return () => {
				cancelled = true;
				if (animationFrameId !== null) {
					window.cancelAnimationFrame(animationFrameId);
				}
				resizeObserver?.disconnect();
				layer?.destroy();
				if (app) {
					destroyPixiApp(app);
				}
				app   = null;
				layer = null;
			};
		},
		[
			backgroundStyle,
			canvasHostRef,
			diagnostics,
		],
	);
}

function destroyPixiApp(app: Application): void {
	app.destroy(
		{ removeView: true },
		{
			children:      true,
			texture:       true,
			textureSource: true,
			context:       true,
		},
	);
}
