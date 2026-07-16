import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	canvasDiagnosticsStatusChanges,
	loadCanvasDiagnosticsStatus,
	loadDevModeStatus,
} from "./canvas-diagnostics-runner";
import { UserConfigFacade } from "./facades";

describe(
	"canvas-diagnostics-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads diagnostics gates through the user config facade",
			async () => {
				vi.spyOn(
					UserConfigFacade,
					"getDevModeStatus",
				).mockResolvedValue(true);
				vi.spyOn(
					UserConfigFacade,
					"getCanvasDiagnosticsStatus",
				).mockResolvedValue(false);

				await expect(loadDevModeStatus()).resolves.toBe(true);
				await expect(loadCanvasDiagnosticsStatus()).resolves.toBe(false);

				expect(UserConfigFacade.getDevModeStatus).toHaveBeenCalledTimes(1);
				expect(UserConfigFacade.getCanvasDiagnosticsStatus).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"exposes canvas diagnostics changes from the user config facade",
			() => {
				const changes$ = new Subject<boolean>();
				const listener = vi.fn();
				vi.spyOn(
					UserConfigFacade,
					"canvasDiagnosticsStatusChanges",
				).mockReturnValue(changes$);

				const subscription = canvasDiagnosticsStatusChanges().subscribe(listener);
				changes$.next(true);

				expect(listener).toHaveBeenCalledWith(true);
				expect(UserConfigFacade.canvasDiagnosticsStatusChanges).toHaveBeenCalledTimes(1);

				subscription.unsubscribe();
			},
		);
	},
);
