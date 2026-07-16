// @vitest-environment jsdom
import type { ToasterMessageEvent } from "@nimlat/types/toaster";
import { ToasterType } from "@nimlat/types/toaster";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import {
	createRoot,
	type Root,
} from "react-dom/client";
import { Subject } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

let toasterMessages$: Subject<ToasterMessageEvent>;
let cleanupRenderedHooks: Array<() => void> = [];
let messageApi: {
	error: ReturnType<typeof vi.fn>;
	info: ReturnType<typeof vi.fn>;
	success: ReturnType<typeof vi.fn>;
};

function renderToasterHook(useToasterMessages: () => void): { unmount: () => void } {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let isMounted    = true;

	function ToasterHookHost(): ReactElement | null {
		useToasterMessages();
		return null;
	}

	flushSync(() => {
		root.render(createElement(ToasterHookHost));
	});

	const unmount = () => {
		if (!isMounted) {
			return;
		}

		isMounted = false;
		flushSync(() => {
			root.unmount();
		});
	};

	cleanupRenderedHooks.push(unmount);

	return { unmount };
}

async function flushEffects(): Promise<void> {
	for (let index = 0; index < 3; index += 1) {
		await new Promise(resolve => setTimeout(
			resolve,
			0,
		));
		await Promise.resolve();
		await Promise.resolve();
	}
}

describe(
	"useToasterMessages",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.useRealTimers();
			toasterMessages$ = new Subject<ToasterMessageEvent>();
			messageApi       = {
				error:   vi.fn(),
				info:    vi.fn(),
				success: vi.fn(),
			};
			vi.doMock(
				"antd",
				() => ({
					App: {
						useApp: () => ({ message: messageApi }),
					},
				}),
			);
			vi.doMock(
				"../facades",
				() => ({
					ToasterFacade: {
						messages: vi.fn(() => toasterMessages$),
					},
				}),
			);
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanup => cleanup());
			cleanupRenderedHooks = [];
			toasterMessages$.complete();
			vi.restoreAllMocks();
			vi.useRealTimers();
			vi.doUnmock("antd");
			vi.doUnmock("../facades");
		});

		it(
			"shows main-process toast messages through Ant Design and unsubscribes on unmount",
			async () => {
				const { useToasterMessages } = await import("./useToasterMessages");
				const rendered               = renderToasterHook(useToasterMessages);
				await flushEffects();

				toasterMessages$.next({
					type:    ToasterType.SUCCESS,
					message: "Saved",
				});
				toasterMessages$.next({
					type:    ToasterType.ERROR,
					message: "Failed",
				});
				toasterMessages$.next({
					type:    ToasterType.INFO,
					message: "Queued",
				});

				expect(messageApi.success).toHaveBeenCalledWith("Saved");
				expect(messageApi.error).toHaveBeenCalledWith("Failed");
				expect(messageApi.info).toHaveBeenCalledWith("Queued");

				rendered.unmount();
				toasterMessages$.next({
					type:    ToasterType.SUCCESS,
					message: "Hidden",
				});
				expect(messageApi.success).toHaveBeenCalledTimes(1);
			},
		);
	},
);
