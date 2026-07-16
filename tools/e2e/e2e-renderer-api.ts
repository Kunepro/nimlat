import type { Page } from "playwright";
import type { ElectronAPI } from "../../src/shared/types/electron-api";
import type { ExternalTrackingAccountsChangedEvent } from "../../src/shared/types/external-tracking";
import type {
	AnimeDbDownloadProgressData,
	AnimeDbUpdateProgressData,
	GroupListChangedEvent,
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
	HydratorProgressEvent,
	MediaEpisodesItemsPatchedEvent,
	MediaEpisodesListChangedEvent,
} from "../../src/shared/types/ipc-payloads";
import type { ReleaseWatchListChangedEvent } from "../../src/shared/types/release-watch";
import type {
	BackgroundStyle,
	PreferredTitleLanguage,
} from "../../src/shared/types/user-config";

type CallablePropertyName<T> = {
	[Key in keyof T]: T[Key] extends (...args: never[]) => unknown ? Key : never;
}[keyof T];

type ApiGroupName = keyof ElectronAPI;

type ApiMethodName<GroupName extends ApiGroupName> = CallablePropertyName<ElectronAPI[GroupName]>;

type ApiMethod<
	GroupName extends ApiGroupName,
	MethodName extends ApiMethodName<GroupName>,
> = Extract<ElectronAPI[GroupName][MethodName], (...args: never[]) => unknown>;

type RendererEventBufferMap = {
	adultContentStatusChanged: boolean[];
	animeDbDownloadProgress: AnimeDbDownloadProgressData[];
	animeDbUpdateProgress: AnimeDbUpdateProgressData[];
	aniListQueuePaused: number[];
	backgroundStyleChanged: BackgroundStyle[];
	canvasDiagnosticsStatusChanged: boolean[];
	externalTrackingAccountsChanged: ExternalTrackingAccountsChangedEvent[];
	groupListChanged: GroupListChangedEvent[];
	groupMediaItemsPatched: GroupMediaItemsPatchedEvent[];
	groupMediaListChanged: GroupMediaListChangedEvent[];
	hydratorProgress: HydratorProgressEvent[];
	hydratorQueueChanged: Array<{ at: number }>;
	mediaEpisodesItemsPatched: MediaEpisodesItemsPatchedEvent[];
	mediaEpisodesListChanged: MediaEpisodesListChangedEvent[];
	preferredTitleLanguageChanged: PreferredTitleLanguage[];
	releaseWatchPastListChanged: ReleaseWatchListChangedEvent[];
	releaseWatchUpcomingListChanged: ReleaseWatchListChangedEvent[];
};

export type RendererEventName = keyof RendererEventBufferMap;

interface RendererEventStoreWindow extends Window {
	__nimlatE2EEventBuffers?: Partial<Record<RendererEventName, unknown[]>>;
	__nimlatE2EEventUnsubscribers?: Partial<Record<RendererEventName, () => void>>;
}

export async function callRendererApi<
	GroupName extends ApiGroupName,
	MethodName extends ApiMethodName<GroupName>,
>(
	page: Page,
	groupName: GroupName,
	methodName: MethodName,
	...args: Parameters<ApiMethod<GroupName, MethodName>>
): Promise<Awaited<ReturnType<ApiMethod<GroupName, MethodName>>>> {
	return page.evaluate(
		async (payload: {
			args: unknown[];
			groupName: string;
			methodName: string;
		}) => {
			const api       = window.electronAPI as unknown as Record<string, Record<string, (...methodArgs: unknown[]) => unknown>>;
			const apiGroup  = api[ payload.groupName ];
			const apiMethod = apiGroup?.[ payload.methodName ];
			if (typeof apiMethod !== "function") {
				throw new Error(`Renderer API method ${ payload.groupName }.${ payload.methodName } is not available.`);
			}
			return apiMethod(...payload.args);
		},
		{
			args:       args as unknown[],
			groupName:  String(groupName),
			methodName: String(methodName),
		},
	) as Promise<Awaited<ReturnType<ApiMethod<GroupName, MethodName>>>>;
}

export async function startRendererEventRecorder<EventName extends RendererEventName>(
	page: Page,
	eventName: EventName,
): Promise<void> {
	await page.evaluate(
		(name: RendererEventName) => {
			const target = window as RendererEventStoreWindow;
			target.__nimlatE2EEventBuffers ??= {};
			target.__nimlatE2EEventUnsubscribers ??= {};
			target.__nimlatE2EEventUnsubscribers[ name ]?.();
			target.__nimlatE2EEventBuffers[ name ] = [];

			const push                                                                                               = (event: unknown) => {
				target.__nimlatE2EEventBuffers?.[ name ]?.push(event);
			};
			const subscribeByEventName: Record<RendererEventName, (onEvent: (event: unknown) => void) => () => void> = {
				adultContentStatusChanged:       (onEvent) => window.electronAPI.userConfig.onAdultContentStatusChanged(onEvent),
				animeDbDownloadProgress:         (onEvent) => window.electronAPI.animeDbDownload.onAnimeDbDownloadProgress(onEvent),
				animeDbUpdateProgress:           (onEvent) => window.electronAPI.animeDbUpdate.onAnimeDbUpdateProgress(onEvent),
				aniListQueuePaused:              (onEvent) => window.electronAPI.aniListQueue.onPaused(onEvent),
				backgroundStyleChanged:          (onEvent) => window.electronAPI.userConfig.onBackgroundStyleChanged(onEvent),
				canvasDiagnosticsStatusChanged:  (onEvent) => window.electronAPI.userConfig.onCanvasDiagnosticsStatusChanged(onEvent),
				externalTrackingAccountsChanged: (onEvent) => window.electronAPI.externalTracking.onAccountsChanged(onEvent),
				groupListChanged:                (onEvent) => window.electronAPI.groupExplorer.onGroupListChanged(onEvent),
				groupMediaItemsPatched:          (onEvent) => window.electronAPI.groupExplorer.onGroupMediaItemsPatched(onEvent),
				groupMediaListChanged:           (onEvent) => window.electronAPI.groupExplorer.onGroupMediaListChanged(onEvent),
				hydratorProgress:                (onEvent) => window.electronAPI.hydrator.onProgress(onEvent),
				hydratorQueueChanged:            (onEvent) => window.electronAPI.hydrator.onQueueChanged(() => onEvent({ at: Date.now() })),
				mediaEpisodesItemsPatched:       (onEvent) => window.electronAPI.groupExplorer.onMediaEpisodesItemsPatched(onEvent),
				mediaEpisodesListChanged:        (onEvent) => window.electronAPI.groupExplorer.onMediaEpisodesListChanged(onEvent),
				preferredTitleLanguageChanged:   (onEvent) => window.electronAPI.userConfig.onPreferredTitleLanguageChanged(onEvent),
				releaseWatchPastListChanged:     (onEvent) => window.electronAPI.releaseWatch.onPastListChanged(onEvent),
				releaseWatchUpcomingListChanged: (onEvent) => window.electronAPI.releaseWatch.onUpcomingListChanged(onEvent),
			};

			target.__nimlatE2EEventUnsubscribers[ name ] = subscribeByEventName[ name ](push);
		},
		eventName,
	);
}

export async function readRendererEvents<EventName extends RendererEventName>(
	page: Page,
	eventName: EventName,
): Promise<RendererEventBufferMap[EventName]> {
	return page.evaluate(
		(name: RendererEventName) => {
			const target = window as RendererEventStoreWindow;
			return [ ...(target.__nimlatE2EEventBuffers?.[ name ] ?? []) ];
		},
		eventName,
	) as Promise<RendererEventBufferMap[EventName]>;
}

export async function stopRendererEventRecorder<EventName extends RendererEventName>(
	page: Page,
	eventName: EventName,
): Promise<void> {
	await page.evaluate(
		(name: RendererEventName) => {
			const target = window as RendererEventStoreWindow;
			target.__nimlatE2EEventUnsubscribers?.[ name ]?.();
			delete target.__nimlatE2EEventUnsubscribers?.[ name ];
		},
		eventName,
	);
}
