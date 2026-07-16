export enum ToasterType {
	SUCCESS = "success",
	ERROR   = "error",
	INFO    = "info"
}

export interface ToasterMessageEvent {
	type: ToasterType;
	message: string;
}
