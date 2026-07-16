// Utils are small, reusable helpers with minimal side effects.
import { BUS_ToasterMessage } from "@nimlat/busses/main";
import { ToasterType } from "@nimlat/types/toaster";

// Facade for renderer toast intent. Services publish here without knowing
// Electron windows; the IPC toaster bridge owns renderer delivery.
export class Toaster {
	public static success(message: string): void {
		this.sendToaster(
			ToasterType.SUCCESS,
			message,
		);
	}

	public static error(message: string): void {
		this.sendToaster(
			ToasterType.ERROR,
			message,
		);
	}

	public static info(message: string): void {
		this.sendToaster(
			ToasterType.INFO,
			message,
		);
	}

	private static sendToaster(type: ToasterType, message: string): void {
		BUS_ToasterMessage.next({
			type,
			message,
		});
	}
}
