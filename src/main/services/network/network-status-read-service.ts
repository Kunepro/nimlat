import {
	ActionsNetwork,
	BUS_Network,
} from "@nimlat/busses/main";

class NetworkStatusReadServiceImpl {
	private currentOnlineStatus = false;

	public constructor() {
		// App-lifetime read model: network events are pushed through the main bus,
		// while feature services consume this narrow snapshot instead of coupling
		// themselves to BUS_Network's concrete Subject/BehaviorSubject API.
		BUS_Network.subscribe({
			next: (event) => {
				this.currentOnlineStatus = event.isOnline;
			},
		});
	}

	public isOnline(): boolean {
		return this.currentOnlineStatus;
	}

	public updateOnlineStatusFromRenderer(isOnline: boolean): void {
		BUS_Network.next(ActionsNetwork.connectionChanged({ isOnline }));
	}
}

export const NetworkStatusReadService = new NetworkStatusReadServiceImpl();
