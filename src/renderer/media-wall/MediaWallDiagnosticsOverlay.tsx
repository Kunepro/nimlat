import { Fragment } from "react";
import type { MediaWallDiagnosticsSnapshot } from "../types/media-wall";
import styles from "./MediaWallDiagnosticsOverlay.module.css";

interface MediaWallDiagnosticsOverlayProps {
	snapshot: MediaWallDiagnosticsSnapshot;
	testId?: string;
}

function formatNumber(value: number, fractionDigits = 0): string {
	return Number.isFinite(value)
		? value.toFixed(fractionDigits)
		: "n/a";
}

export function MediaWallDiagnosticsOverlay({
																							snapshot,
																							testId,
																						}: MediaWallDiagnosticsOverlayProps) {
	const frameBudgetPercent              = snapshot.lastRenderMs > 0
		? (snapshot.lastRenderMs / 16.67) * 100
		: 0;
	const rows: Array<[ string, string ]> = [
		[
			"fps",
			formatNumber(
				snapshot.averageFps,
				1,
			),
		],
		[
			"frame",
			`${ formatNumber(
				snapshot.lastRenderMs,
				2,
			) }ms / ${ formatNumber(frameBudgetPercent) }%`,
		],
		[
			"drops",
			snapshot.droppedFrameEstimate.toString(),
		],
		[
			"viewport",
			`${ snapshot.viewportWidth }x${ snapshot.viewportHeight }`,
		],
		[
			"scroll",
			formatNumber(snapshot.scrollTop),
		],
		[
			"total",
			`${ snapshot.totalItems } / ${ snapshot.totalRows }r`,
		],
		[
			"visible",
			`${ snapshot.visibleFirstIndex }-${ snapshot.visibleLastIndexExclusive } (${ snapshot.visibleCount })`,
		],
		[
			"range",
			`${ snapshot.rangeOffset }+${ snapshot.rangeLength }`,
		],
		[
			"pool",
			snapshot.poolSize.toString(),
		],
		[
			"textures",
			`${ snapshot.textureCacheSize } tex`,
		],
		[
			"images",
			`${ snapshot.visibleTextureCount } / ${ snapshot.visibleThumbnailUrlCount }`,
		],
		[
			"loading",
			`${ snapshot.pendingThumbnailCount } pending / ${ snapshot.failedThumbnailCount } failed`,
		],
	];

	return (
		<div
			className={ styles.overlay }
			data-testid={ testId }
		>
			{ rows.map(([ label, value ]) => (
				<Fragment key={ label }>
					<span className={ styles.label }>{ label }</span>
					<span
						className={ styles.value }
						data-media-wall-diagnostic={ label }
					>
						{ value }
					</span>
				</Fragment>
			)) }
		</div>
	);
}
