import {
	Observable,
	share,
} from "rxjs";

type PreloadEventListener<TEvent> = (event: TEvent) => void;
type PreloadEventRegistration<TEvent> = (listener: PreloadEventListener<TEvent>) => () => void;

// The Electron preload bridge is callback-shaped by necessity. Renderer domain
// code adapts it once into a shared Observable so consumers compose streams
// instead of passing behavior callbacks into facades/services.
export function createSharedPreloadEventStream<TEvent>(
	register: PreloadEventRegistration<TEvent>,
): Observable<TEvent> {
	return new Observable<TEvent>((subscriber) => register((event) => {
		subscriber.next(event);
	})).pipe(share());
}
