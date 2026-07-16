import type { FormInstance } from "antd";
import { useEffect } from "react";

type EditModalFormValues<TValues extends object> = Parameters<FormInstance<TValues>["setFieldsValue"]>[0];

interface UseEditModalFormResetOptions<TValues extends object> {
	form: FormInstance<TValues>;
	initialValues: EditModalFormValues<TValues>;
	isOpen: boolean;
}

// Closed Ant Design modals can have disconnected form instances; only reset
// once the modal is open and the form is mounted in the DOM.
export function useEditModalFormReset<TValues extends object>({
																																form,
																																initialValues,
																																isOpen,
																															}: UseEditModalFormResetOptions<TValues>): void {
	useEffect(
		() => {
			if (!isOpen) {
				return;
			}

			form.resetFields();
			form.setFieldsValue(initialValues);
		},
		[
			form,
			initialValues,
			isOpen,
		],
	);
}
