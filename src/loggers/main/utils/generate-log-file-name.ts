import { PATH_LOGS } from "@nimlat/constants/main/system-folders";
import { join } from "path";

export function generateLogFileName(prefix: string, timestamp: number): string {
	return join(
		PATH_LOGS,
		`${ prefix }-${ timestamp }.log`,
	);
}
