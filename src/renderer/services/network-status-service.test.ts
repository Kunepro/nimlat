// @vitest-environment node
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

type NetworkTestWindow = EventTarget & {
	electronAPI: {
		network: {
			sendConnectivityStatus: (isOnline: boolean) => void;
		};
	};
};

let isNavigatorOnline        = false;
const sendConnectivityStatus = vi.fn();

function installNetworkBrowserGlobals(): NetworkTestWindow {
	const networkWindow       = new EventTarget() as NetworkTestWindow;
	networkWindow.electronAPI = {
		network: {
			sendConnectivityStatus,
		},
	};

	const navigatorStub = {};
	Object.defineProperty(
		navigatorStub,
		"onLine",
		{
			configurable: true,
			get:          () => isNavigatorOnline,
		},
	);

	vi.stubGlobal(
		"window",
		networkWindow,
	);
	vi.stubGlobal(
		"navigator",
		navigatorStub,
	);

	return networkWindow;
}

describe(
	"networkStatusService",
	() => {
		let networkWindow: NetworkTestWindow;

		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			isNavigatorOnline = false;
			networkWindow     = installNetworkBrowserGlobals();
		});

		afterEach(async () => {
			const { networkStatusService } = await import("./network-status-service");
			networkStatusService.stop();
			vi.unstubAllGlobals();
		});

		it(
			"publishes browser network changes through a shared snapshot",
			async () => {
				const { networkStatusService } = await import("./network-status-service");
				const snapshots: boolean[]     = [];
				const subscription             = networkStatusService.statusChanges().subscribe((isOnline) => {
					snapshots.push(isOnline);
				});

				expect(snapshots).toEqual([ false ]);

				networkStatusService.start();
				expect(sendConnectivityStatus).toHaveBeenCalledWith(false);

				isNavigatorOnline = true;
				networkWindow.dispatchEvent(new Event("online"));

				expect(snapshots).toEqual([
					false,
					true,
				]);
				expect(networkStatusService.getSnapshot()).toBe(true);
				expect(sendConnectivityStatus).toHaveBeenLastCalledWith(true);

				subscription.unsubscribe();
				isNavigatorOnline = false;
				networkWindow.dispatchEvent(new Event("offline"));

				expect(snapshots).toEqual([
					false,
					true,
				]);
			},
		);

		it(
			"does not attach duplicate browser subscriptions",
			async () => {
				const { networkStatusService } = await import("./network-status-service");
				networkStatusService.start();
				networkStatusService.start();

				expect(sendConnectivityStatus).toHaveBeenCalledTimes(1);

				isNavigatorOnline = true;
				networkWindow.dispatchEvent(new Event("online"));

				expect(sendConnectivityStatus).toHaveBeenCalledTimes(2);
				expect(sendConnectivityStatus).toHaveBeenLastCalledWith(true);
			},
		);

		it(
			"stops forwarding browser events after stop",
			async () => {
				const { networkStatusService } = await import("./network-status-service");
				networkStatusService.start();
				networkStatusService.stop();

				isNavigatorOnline = true;
				networkWindow.dispatchEvent(new Event("online"));

				expect(sendConnectivityStatus).toHaveBeenCalledTimes(1);
				expect(networkStatusService.getSnapshot()).toBe(false);
			},
		);
	},
);
