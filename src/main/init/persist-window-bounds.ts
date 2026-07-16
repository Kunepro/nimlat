import { UserDbFacade } from "@nimlat/database";
import type { BrowserWindow } from "electron";
import {
	debounceTime,
	fromEvent,
	merge,
	Subscription,
} from "rxjs";

const WINDOW_BOUNDS_SAVE_DEBOUNCE_MS = 250;

export function restoreMaximizedState(win: BrowserWindow, shouldMaximize?: boolean): void {
	if (shouldMaximize) win.maximize();
}

export function registerWindowBoundsPersistence(win: BrowserWindow): void {
	const saveBounds = () => {
		const isMaximized = win.isMaximized();
		const bounds      = isMaximized ? win.getNormalBounds() : win.getBounds();

		UserDbFacade.config.setWindowBounds({
			...bounds,
			isMaximized,
		});
	};

	const subscriptions = new Subscription();

	// Window geometry fires noisy move/resize bursts, so only those transitions
	// are debounced; maximize and close need immediate persistence semantics.
	subscriptions.add(merge(
		fromEvent(
			win,
			"resize",
		),
		fromEvent(
			win,
			"move",
		),
		fromEvent(
			win,
			"unmaximize",
		),
	).pipe(debounceTime(WINDOW_BOUNDS_SAVE_DEBOUNCE_MS)).subscribe(saveBounds));

	subscriptions.add(fromEvent(
		win,
		"maximize",
	).subscribe(saveBounds));
	subscriptions.add(fromEvent(
		win,
		"close",
	).subscribe(() => {
		subscriptions.unsubscribe();
		saveBounds();
	}));
}
