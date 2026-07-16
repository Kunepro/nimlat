// @vitest-environment node
import { BehaviorSubject } from "rxjs";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

type NetworkConnectionChangedEvent = {
	type: "[Network] Connection Changed";
	isOnline: boolean;
};

function createNetworkEvent(isOnline: boolean): NetworkConnectionChangedEvent {
	return {
		type: "[Network] Connection Changed",
		isOnline,
	};
}

const networkBus = new BehaviorSubject<NetworkConnectionChangedEvent>(createNetworkEvent(false));

vi.mock(
	"@nimlat/busses/main",
	() => ({
		ActionsNetwork: {
			connectionChanged: (payload: { isOnline: boolean }) => createNetworkEvent(payload.isOnline),
		},
		BUS_Network:    networkBus,
	}),
);

describe(
	"NetworkStatusReadService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			networkBus.next(createNetworkEvent(false));
		});

		it(
			"tracks the latest network action from the bus",
			async () => {
				const { NetworkStatusReadService } = await import("./network-status-read-service");

				expect(NetworkStatusReadService.isOnline()).toBe(false);

				networkBus.next(createNetworkEvent(true));

				expect(NetworkStatusReadService.isOnline()).toBe(true);
			},
		);

		it(
			"publishes renderer network updates through the main bus",
			async () => {
				const { NetworkStatusReadService } = await import("./network-status-read-service");

				NetworkStatusReadService.updateOnlineStatusFromRenderer(true);

				expect(networkBus.value).toEqual(createNetworkEvent(true));
				expect(NetworkStatusReadService.isOnline()).toBe(true);
			},
		);
	},
);
