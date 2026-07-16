// @vitest-environment jsdom
import type { FormInstance } from "antd";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { useEditModalFormReset } from "./useEditModalFormReset";

interface FormValues {
	description?: string;
	name: string;
}

interface RenderedHook<TProps> {
	rerender: (props: TProps) => void;
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function createFormDouble(): FormInstance<FormValues> {
	return {
		resetFields:    vi.fn(),
		setFieldsValue: vi.fn(),
	} as unknown as FormInstance<FormValues>;
}

function renderHook<TProps>(
	useHook: (props: TProps) => void,
	initialProps: TProps,
): RenderedHook<TProps> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentProps = initialProps;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		useHook(currentProps);
		return null;
	}

	const renderCurrentProps = () => {
		flushSync(() => {
			root.render(createElement(HookHost));
		});
	};

	renderCurrentProps();

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

	return {
		rerender: (props: TProps) => {
			currentProps = props;
			renderCurrentProps();
		},
		unmount,
	};
}

describe(
	"useEditModalFormReset",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"resets and seeds the Ant form only when the edit modal is open",
			() => {
				const form         = createFormDouble();
				const closedValues = {
					name:        "Closed",
					description: "Hidden",
				};
				const openValues   = {
					name:        "Open",
					description: "Visible",
				};

				const hook = renderHook(
					(props: {
						initialValues: FormValues;
						isOpen: boolean;
					}) => useEditModalFormReset({
						form,
						initialValues: props.initialValues,
						isOpen:        props.isOpen,
					}),
					{
						initialValues: closedValues,
						isOpen:        false,
					},
				);

				expect(form.resetFields).not.toHaveBeenCalled();
				expect(form.setFieldsValue).not.toHaveBeenCalled();

				hook.rerender({
					initialValues: openValues,
					isOpen:        true,
				});

				expect(form.resetFields).toHaveBeenCalledTimes(1);
				expect(form.setFieldsValue).toHaveBeenCalledWith(openValues);
			},
		);
	},
);
