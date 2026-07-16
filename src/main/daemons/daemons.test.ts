// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => {
	const daemonManagerDispose = vi.fn();
	const releaseWatchDispose  = vi.fn();
	const DaemonManagerMock    = vi.fn().mockImplementation(() => ({ dispose: daemonManagerDispose }));
	const ReleaseWatchMock     = vi.fn().mockImplementation(() => ({ dispose: releaseWatchDispose }));

	return {
		daemonManagerDispose,
		releaseWatchDispose,
		DaemonManagerMock,
		ReleaseWatchMock,
	};
});

vi.mock(
	"./media-hydrator/daemon-manager",
	() => ({ DaemonManager: mocks.DaemonManagerMock }),
);

vi.mock(
	"./release-watch-daemon",
	() => ({ ReleaseWatchDaemon: mocks.ReleaseWatchMock }),
);

describe(
	"daemon lifecycle",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"starts daemon consumers once",
			async () => {
				const { initDaemons } = await import("./daemons");

				initDaemons();
				initDaemons();

				expect(mocks.DaemonManagerMock).toHaveBeenCalledTimes(1);
				expect(mocks.ReleaseWatchMock).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"disposes retained daemon handles and allows a later restart",
			async () => {
				const {
								disposeDaemons,
								initDaemons,
							} = await import("./daemons");

				initDaemons();
				disposeDaemons();
				initDaemons();

				expect(mocks.daemonManagerDispose).toHaveBeenCalledTimes(1);
				expect(mocks.releaseWatchDispose).toHaveBeenCalledTimes(1);
				expect(mocks.DaemonManagerMock).toHaveBeenCalledTimes(2);
				expect(mocks.ReleaseWatchMock).toHaveBeenCalledTimes(2);
			},
		);
	},
);
