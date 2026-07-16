// @vitest-environment node
import type { AppUpdateStatus } from "@nimlat/types/app-update";
import type {
	ExternalTrackingAccountsChangedEvent,
	ExternalTrackingExportProgressEvent,
} from "@nimlat/types/external-tracking";
import type { ReleaseWatchListChangedEvent } from "@nimlat/types/release-watch";
import type { ToasterMessageEvent } from "@nimlat/types/toaster";
import { ToasterType } from "@nimlat/types/toaster";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

function installRendererDomainEventApis() {
	let pastReleaseWatchListener: ((event: ReleaseWatchListChangedEvent) => void) | null         = null;
	let upcomingReleaseWatchListener: ((event: ReleaseWatchListChangedEvent) => void) | null     = null;
	let appUpdateListener: ((event: AppUpdateStatus) => void) | null                             = null;
	let externalTrackingListener: ((event: ExternalTrackingAccountsChangedEvent) => void) | null = null;
	let externalTrackingProgressListener: ((event: ExternalTrackingExportProgressEvent) => void) | null = null;
	let toasterListener: ((event: ToasterMessageEvent) => void) | null                           = null;
	const unsubscribers                                                                          = {
		pastReleaseWatch:     vi.fn(),
		upcomingReleaseWatch: vi.fn(),
		appUpdate:            vi.fn(),
		externalTracking:     vi.fn(),
		externalTrackingProgress: vi.fn(),
		toaster:              vi.fn(),
	};
	const electronAPI                                                                            = {
		releaseWatch:     {
			onPastListChanged:     vi.fn((listener: (event: ReleaseWatchListChangedEvent) => void) => {
				pastReleaseWatchListener = listener;
				return unsubscribers.pastReleaseWatch;
			}),
			onUpcomingListChanged: vi.fn((listener: (event: ReleaseWatchListChangedEvent) => void) => {
				upcomingReleaseWatchListener = listener;
				return unsubscribers.upcomingReleaseWatch;
			}),
		},
		appUpdate:        {
			onStatusChanged: vi.fn((listener: (event: AppUpdateStatus) => void) => {
				appUpdateListener = listener;
				return unsubscribers.appUpdate;
			}),
		},
		externalTracking: {
			onAccountsChanged: vi.fn((listener: (event: ExternalTrackingAccountsChangedEvent) => void) => {
				externalTrackingListener = listener;
				return unsubscribers.externalTracking;
			}),
			onExportProgress: vi.fn((listener: (event: ExternalTrackingExportProgressEvent) => void) => {
				externalTrackingProgressListener = listener;
				return unsubscribers.externalTrackingProgress;
			}),
		},
		toaster:          {
			onToasterMessage: vi.fn((listener: (event: ToasterMessageEvent) => void) => {
				toasterListener = listener;
				return unsubscribers.toaster;
			}),
		},
	};

	vi.stubGlobal(
		"window",
		{ electronAPI },
	);

	return {
		electronAPI,
		unsubscribers,
		emitPastReleaseWatch:     (event: ReleaseWatchListChangedEvent) => {
			pastReleaseWatchListener?.(event);
		},
		emitUpcomingReleaseWatch: (event: ReleaseWatchListChangedEvent) => {
			upcomingReleaseWatchListener?.(event);
		},
		emitAppUpdate:            (event: AppUpdateStatus) => {
			appUpdateListener?.(event);
		},
		emitExternalTracking:     (event: ExternalTrackingAccountsChangedEvent) => {
			externalTrackingListener?.(event);
		},
		emitExternalTrackingProgress: (event: ExternalTrackingExportProgressEvent) => {
			externalTrackingProgressListener?.(event);
		},
		emitToaster:              (event: ToasterMessageEvent) => {
			toasterListener?.(event);
		},
	};
}

const appUpdateStatus: AppUpdateStatus = {
	state:   "idle",
	version: {
		releaseNumber:    1,
		technicalVersion: "1.0.0",
		displayVersion:   "1.0.0",
	},
};

describe(
	"renderer domain event services",
	() => {
		beforeEach(() => {
			vi.resetModules();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"wires release-watch, app-update, and external-tracking streams",
			async () => {
				const {
								emitAppUpdate,
								emitExternalTracking,
								emitExternalTrackingProgress,
								emitPastReleaseWatch,
								emitToaster,
								emitUpcomingReleaseWatch,
								electronAPI,
							}                                                           = installRendererDomainEventApis();
				const { ReleaseWatchEventService }                                = await import("./release-watch-event-service");
				const { AppUpdateEventService }                                   = await import("./app-update-event-service");
				const { ExternalTrackingEventService }                            = await import("./external-tracking-event-service");
				const { ToasterEventService }                                     = await import("./toaster-event-service");
				const pastReleaseWatchListener                                    = vi.fn();
				const upcomingReleaseWatchListener                                = vi.fn();
				const appUpdateStatusListener                                     = vi.fn();
				const externalTrackingListener                                    = vi.fn();
				const externalTrackingProgressListener                                   = vi.fn();
				const toasterMessageListener                                      = vi.fn();
				const releaseWatchEvent: ReleaseWatchListChangedEvent             = { affectedMediaIds: [ 20 ] };
				const externalTrackingEvent: ExternalTrackingAccountsChangedEvent = { provider: "anilist" };
				const externalTrackingProgressEvent: ExternalTrackingExportProgressEvent = {
					provider:       "kitsu",
					completedItems: 5,
					totalItems:     54,
					active:         true,
				};
				const toasterEvent: ToasterMessageEvent                           = {
					type:    ToasterType.SUCCESS,
					message: "Saved",
				};

				const subscriptions = [
					ReleaseWatchEventService.pastListChanges().subscribe(pastReleaseWatchListener),
					ReleaseWatchEventService.upcomingListChanges().subscribe(upcomingReleaseWatchListener),
					AppUpdateEventService.statusChanges().subscribe(appUpdateStatusListener),
					ExternalTrackingEventService.accountsChanges().subscribe(externalTrackingListener),
					ExternalTrackingEventService.exportProgress().subscribe(externalTrackingProgressListener),
					ToasterEventService.messages().subscribe(toasterMessageListener),
				];

				expect(electronAPI.releaseWatch.onPastListChanged).toHaveBeenCalledTimes(1);
				expect(electronAPI.releaseWatch.onUpcomingListChanged).toHaveBeenCalledTimes(1);
				expect(electronAPI.appUpdate.onStatusChanged).toHaveBeenCalledTimes(1);
				expect(electronAPI.externalTracking.onAccountsChanged).toHaveBeenCalledTimes(1);
				expect(electronAPI.externalTracking.onExportProgress).toHaveBeenCalledTimes(1);
				expect(electronAPI.toaster.onToasterMessage).toHaveBeenCalledTimes(1);

				emitPastReleaseWatch(releaseWatchEvent);
				emitUpcomingReleaseWatch(releaseWatchEvent);
				emitAppUpdate(appUpdateStatus);
				emitExternalTracking(externalTrackingEvent);
				emitExternalTrackingProgress(externalTrackingProgressEvent);
				emitToaster(toasterEvent);

				expect(pastReleaseWatchListener).toHaveBeenCalledWith(releaseWatchEvent);
				expect(upcomingReleaseWatchListener).toHaveBeenCalledWith(releaseWatchEvent);
				expect(appUpdateStatusListener).toHaveBeenCalledWith(appUpdateStatus);
				expect(externalTrackingListener).toHaveBeenCalledWith(externalTrackingEvent);
				expect(externalTrackingProgressListener).toHaveBeenCalledWith(externalTrackingProgressEvent);
				expect(toasterMessageListener).toHaveBeenCalledWith(toasterEvent);

				subscriptions.forEach(subscription => subscription.unsubscribe());
			},
		);
	},
);
