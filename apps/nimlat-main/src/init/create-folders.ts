import { PATH_DATA, PATH_LOGS } from '@nimlat/const/main/system-folders';
import { mkdirSync } from "fs";

// Ensure required folders exist on startup

mkdirSync(
  PATH_DATA,
	{ recursive: true },
);
mkdirSync(
	PATH_LOGS,
	{ recursive: true },
);
