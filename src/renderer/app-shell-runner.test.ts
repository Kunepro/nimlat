import type { BackgroundStyle } from "@nimlat/types/user-config";
import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	backgroundStyleChanges,
	loadBackgroundStyle,
	persistLastRoute,
} from "./app-shell-runner";
import { UserConfigFacade } from "./facades";

describe(
	"app-shell-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads and persists shell config through the user config facade",
			async () => {
				vi.spyOn(
					UserConfigFacade,
					"setLastRoute",
				).mockResolvedValue(undefined);
				vi.spyOn(
					UserConfigFacade,
					"getBackgroundStyle",
				).mockResolvedValue("synthwave");

				await expect(persistLastRoute("/groups")).resolves.toBeUndefined();
				await expect(loadBackgroundStyle()).resolves.toBe("synthwave");

				expect(UserConfigFacade.setLastRoute).toHaveBeenCalledWith("/groups");
				expect(UserConfigFacade.getBackgroundStyle).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"exposes background style changes from the user config facade",
			() => {
				const changes$ = new Subject<BackgroundStyle>();
				const listener = vi.fn();
				vi.spyOn(
					UserConfigFacade,
					"backgroundStyleChanges",
				).mockReturnValue(changes$);

				const subscription = backgroundStyleChanges().subscribe(listener);
				changes$.next("staticDarkBlue");

				expect(listener).toHaveBeenCalledWith("staticDarkBlue");
				expect(UserConfigFacade.backgroundStyleChanges).toHaveBeenCalledTimes(1);

				subscription.unsubscribe();
			},
		);
	},
);
