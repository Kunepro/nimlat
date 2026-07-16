import { ToasterEventService } from "../services/toaster-event-service";

type ToasterEventApi = typeof ToasterEventService;

export class ToasterFacade {
	public static messages(...args: Parameters<ToasterEventApi["messages"]>): ReturnType<ToasterEventApi["messages"]> {
		return ToasterEventService.messages(...args);
	}
}
