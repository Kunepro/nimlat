// @vitest-environment node
import type { ToasterMessageEvent } from "@nimlat/types/toaster";
import { ToasterType } from "@nimlat/types/toaster";
import { Subject } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

let toasterBus: Subject<ToasterMessageEvent>;

describe(
	"Toaster",
	() => {
		beforeEach(() => {
			vi.resetModules();
			toasterBus = new Subject<ToasterMessageEvent>();
			vi.doMock(
				"@nimlat/busses/main",
				() => ({
					BUS_ToasterMessage: toasterBus,
				}),
			);
		});

		afterEach(() => {
			toasterBus.complete();
			vi.doUnmock("@nimlat/busses/main");
		});

		it(
			"publishes toast intent without touching renderer IPC",
			async () => {
				const events: ToasterMessageEvent[] = [];
				const subscription                  = toasterBus.subscribe(event => events.push(event));
				const { Toaster }                   = await import("./toaster");

				Toaster.success("Saved");
				Toaster.error("Failed");
				Toaster.info("Queued");

				expect(events).toEqual([
					{
						type:    ToasterType.SUCCESS,
						message: "Saved",
					},
					{
						type:    ToasterType.ERROR,
						message: "Failed",
					},
					{
						type:    ToasterType.INFO,
						message: "Queued",
					},
				]);
				subscription.unsubscribe();
			},
		);
	},
);
