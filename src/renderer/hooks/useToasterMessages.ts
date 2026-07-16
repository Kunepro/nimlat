import type { ToasterMessageEvent } from "@nimlat/types/toaster";
import { ToasterType } from "@nimlat/types/toaster";
import { useEffect } from "react";
import { ToasterFacade } from "../facades";
import {
	type AppMessageApi,
	useAppMessage,
} from "./useAppMessage";

function showToasterMessage(messageApi: AppMessageApi, event: ToasterMessageEvent): void {
	switch (event.type) {
		case ToasterType.SUCCESS:
			messageApi.success(event.message);
			return;
		case ToasterType.ERROR:
			messageApi.error(event.message);
			return;
		case ToasterType.INFO:
			messageApi.info(event.message);
			return;
	}
}

export function useToasterMessages(): void {
	const messageApi = useAppMessage();

	useEffect(
		() => {
			// The app shell is the single renderer subscriber for main-process toast
			// intent; feature code publishes actions, not UI behavior callbacks.
			const subscription = ToasterFacade.messages().subscribe((event) => {
				showToasterMessage(
					messageApi,
					event,
				);
			});

			return () => {
				subscription.unsubscribe();
			};
		},
		[ messageApi ],
	);
}
