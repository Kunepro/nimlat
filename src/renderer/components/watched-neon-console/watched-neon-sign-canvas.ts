const WATCHED_TEXT        = "WATCHED";
const WATCHED_GREEN       = "#47ff8a";
const WATCHED_CORE        = "#b8ffd2";
const WATCHED_OFF         = "rgba(76, 116, 91, 0.36)";
const WATCHED_SIGN_WIDTH  = 112;
const WATCHED_SIGN_HEIGHT = 24;
const WATCHED_FONT_FAMILY = "\"Goldman\", \"JetBrains Mono\", \"Cascadia Mono\", monospace";

export function loadWatchedSignFont(): Promise<FontFace[]> | undefined {
	return document.fonts?.load(`18px ${ WATCHED_FONT_FAMILY }`);
}

function setWatchedTextFont(context: CanvasRenderingContext2D, text: string): void {
	for (let fontSize = 19; fontSize >= 12; fontSize -= 1) {
		context.font = `400 ${ fontSize }px ${ WATCHED_FONT_FAMILY }`;
		if (context.measureText(text).width <= WATCHED_SIGN_WIDTH - 6) {
			return;
		}
	}
}

function drawNeonText(
	context: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	intensity: number,
	jitter: number,
): void {
	context.save();
	context.textAlign    = "center";
	context.textBaseline = "middle";
	setWatchedTextFont(
		context,
		text,
	);
	context.shadowColor = WATCHED_GREEN;
	// Mirrors the media-wall card neon: broad low-alpha bloom first, hot core last.
	for (const [ blur, alpha ] of [
		[
			18,
			0.3,
		],
		[
			8,
			0.58,
		],
		[
			3,
			0.78,
		],
	] as const) {
		context.shadowBlur  = blur * intensity;
		context.globalAlpha = alpha * intensity;
		context.fillStyle   = WATCHED_GREEN;
		context.fillText(
			text,
			x + jitter,
			y,
		);
	}
	context.shadowBlur  = 0;
	context.globalAlpha = Math.min(
		1,
		0.78 + intensity * 0.2,
	);
	context.fillStyle   = WATCHED_CORE;
	context.fillText(
		text,
		x + jitter,
		y,
	);
	context.restore();
}

function resolveWatchedSignJitter(isLit: boolean, timeMs: number): number {
	if (!isLit) {
		return 0;
	}
	if (Math.sin(timeMs / 47) > 0.86) {
		return 1;
	}
	if (Math.sin(timeMs / 71) < -0.86) {
		return -1;
	}
	return 0;
}

function resizeWatchedSignCanvas(canvas: HTMLCanvasElement): number {
	const pixelRatio   = window.devicePixelRatio || 1;
	const targetWidth  = WATCHED_SIGN_WIDTH * pixelRatio;
	const targetHeight = WATCHED_SIGN_HEIGHT * pixelRatio;
	if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
		canvas.width  = targetWidth;
		canvas.height = targetHeight;
	}
	return pixelRatio;
}

function drawUnlitWatchedText(context: CanvasRenderingContext2D): void {
	context.save();
	context.textAlign    = "center";
	context.textBaseline = "middle";
	setWatchedTextFont(
		context,
		WATCHED_TEXT,
	);
	context.fillStyle   = WATCHED_OFF;
	context.shadowColor = WATCHED_GREEN;
	context.shadowBlur  = 4;
	context.globalAlpha = 0.78;
	context.fillText(
		WATCHED_TEXT,
		WATCHED_SIGN_WIDTH / 2,
		WATCHED_SIGN_HEIGHT / 2 + 0.5,
	);
	context.restore();
}

export function drawWatchedSign(
	canvas: HTMLCanvasElement,
	connected: boolean,
	timeMs: number,
): void {
	const pixelRatio = resizeWatchedSignCanvas(canvas);
	const context    = canvas.getContext("2d");
	if (!context) {
		return;
	}
	context.setTransform(
		pixelRatio,
		0,
		0,
		pixelRatio,
		0,
		0,
	);
	context.clearRect(
		0,
		0,
		WATCHED_SIGN_WIDTH,
		WATCHED_SIGN_HEIGHT,
	);

	const isLit = connected;
	if (!isLit) {
		drawUnlitWatchedText(context);
		return;
	}

	const flicker = Math.min(
		1,
		0.68 + Math.abs(Math.sin(timeMs / 83)) * 0.22 + Math.abs(Math.sin(timeMs / 211)) * 0.12,
	);
	drawNeonText(
		context,
		WATCHED_TEXT,
		WATCHED_SIGN_WIDTH / 2,
		WATCHED_SIGN_HEIGHT / 2 + 0.5,
		flicker,
		resolveWatchedSignJitter(
			isLit,
			timeMs,
		),
	);
}
