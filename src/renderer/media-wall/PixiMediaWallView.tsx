import type { PixiMediaWallViewModel } from "../types/media-wall";
import { MediaWallDiagnosticsOverlay } from "./MediaWallDiagnosticsOverlay";
import styles from "./PixiMediaWallHost.module.css";

export function PixiMediaWallView<TItem>(viewModel: PixiMediaWallViewModel<TItem>) {
	const {
					activeAriaLabel,
					activeIndex,
					ariaLabel,
					className,
					diagnosticsSnapshot,
					getItemAriaLabel,
					handleClick,
					handleKeyDown,
					handlePointerLeave,
					handlePointerMove,
					handleProjectorOverlayAction,
					handleProjectorOverlayPointerLeave: onProjectorLeave,
					handleProjectorOverlayPointerMove:  onProjectorMove,
					handleScroll,
					handleVisualScrollbarPointerDown,
					handleVisualScrollbarPointerMove,
					handleVisualScrollbarPointerUp,
					hasVerticalOverflow,
					hoveredIndex,
					isDiagnosticsEnabled,
					layout,
					pixiLayerRef,
					projectorOverlayItem,
					projectorOverlayStyle,
					rangeState,
					renderProjectorOverlay,
					scrollbarThumbHeight,
					scrollbarThumbTop,
					scrollContainerRef,
					scrollTop,
					size,
					spacerHeight,
					testId,
					visualScrollbarRef,
					visualScrollbarThumbRef,
				} = viewModel;

	return (
		<div
			className={ [
				styles.viewportShell,
				className,
			].filter(Boolean).join(" ") }
		>
			<div
				ref={ scrollContainerRef }
				className={ styles.scrollContainer }
				role="grid"
				aria-label={ ariaLabel }
				aria-rowcount={ layout.totalRows }
				aria-colcount={ layout.columns }
				tabIndex={ 0 }
				data-testid={ testId }
				data-media-wall-total={ rangeState.total }
				data-media-wall-loaded-offset={ rangeState.offset }
				data-media-wall-loaded-count={ rangeState.items.length }
				data-media-wall-active-index={ activeIndex ?? undefined }
				data-media-wall-columns={ layout.columns }
				data-media-wall-card-width={ layout.cardWidth }
				data-media-wall-card-height={ layout.cardHeight }
				data-media-wall-row-height={ layout.rowHeight }
				data-media-wall-horizontal-gap={ layout.horizontalGap }
				data-media-wall-x-origin={ layout.xOrigin }
				data-media-wall-content-inset-top={ layout.contentInsetTop }
				data-media-wall-scroll-top={ scrollTop }
				onScroll={ handleScroll }
				onKeyDown={ handleKeyDown }
			>
				<div
					ref={ pixiLayerRef }
					className={ [
						styles.pixiLayer,
						hoveredIndex === null ? undefined : styles.hoveringItem,
					].filter(Boolean).join(" ") }
					style={ { height: size.height } }
					onPointerMove={ handlePointerMove }
					onPointerLeave={ handlePointerLeave }
					onClick={ handleClick }
				>
					{ isDiagnosticsEnabled ? (
						<MediaWallDiagnosticsOverlay
							snapshot={ diagnosticsSnapshot }
							testId={ testId ? `${ testId }-diagnostics` : undefined }
						/>
					) : null }
				</div>
				{ projectorOverlayItem && renderProjectorOverlay ? (
					<div
						className={ styles.projectorOverlayViewport }
						data-media-wall-projector-overlay="true"
						style={ {
							height:    size.height,
							transform: `translateY(${ scrollTop }px)`,
						} }
					>
						<div
							className={ styles.projectorOverlayLayer }
							style={ projectorOverlayStyle }
							onPointerMove={ onProjectorMove }
							onPointerLeave={ onProjectorLeave }
							onClick={ (event) => {
								event.preventDefault();
								event.stopPropagation();
								// Keep dismissal in the bubble phase so React can finish synthesizing the
								// child radio change before committing the overlay unmount.
								handleProjectorOverlayAction();
							} }
						>
							<div className={ styles.projectorTrackingAnchor }>
								<div
									className={ styles.projectorTrackingBridge }
									aria-hidden="true"
								/>
								<div className={ styles.projectorTrackingMenu }>
									{ renderProjectorOverlay(projectorOverlayItem) }
								</div>
							</div>
						</div>
					</div>
				) : null }
				{ getItemAriaLabel ? (
					<div
						className={ styles.accessibilityBridge }
						aria-live="polite"
						data-testid={ testId ? `${ testId }-active-label` : undefined }
					>
						{ activeAriaLabel }
					</div>
				) : null }
				<div
					className={ styles.virtualSpacer }
					style={ { height: spacerHeight } }
				/>
			</div>
			{ hasVerticalOverflow ? (
				<div
					ref={ visualScrollbarRef }
					className={ styles.visualScrollbar }
					aria-hidden="true"
					style={ { height: size.height } }
					onPointerDown={ handleVisualScrollbarPointerDown }
					onPointerMove={ handleVisualScrollbarPointerMove }
					onPointerUp={ handleVisualScrollbarPointerUp }
					onPointerCancel={ handleVisualScrollbarPointerUp }
				>
					<div
						ref={ visualScrollbarThumbRef }
						className={ styles.visualScrollbarThumb }
						style={ {
							height:    scrollbarThumbHeight,
							transform: `translateY(${ scrollbarThumbTop }px)`,
						} }
					/>
				</div>
			) : null }
		</div>
	);
}
