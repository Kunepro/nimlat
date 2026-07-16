import {
	initDatabases,
	setGroupingDiagnosticsLogger,
	UserDbFacade,
} from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import {
	app,
	protocol,
} from "electron";
import {
	disposeDaemons,
	initDaemons,
} from "./daemons/daemons";
import { createWindow } from "./init/create-window";
import {
	LOCAL_IMAGE_PROTOCOL,
	registerLocalImageProtocol,
} from "./init/register-local-image-protocol";
import { registerIpcMainHandlers } from "./ipc";
import {
	disposeAniListQueueEventsBridge,
	initAniListQueueEventsBridge,
} from "./ipc/ani-list-queue-events-bridge";
import {
	disposeAnimeDbEventsBridge,
	initAnimeDbEventsBridge,
} from "./ipc/anime-db-events-bridge";
import {
	disposeAppUpdateEventsBridge,
	initAppUpdateEventsBridge,
} from "./ipc/app-update-events-bridge";
import {
	disposeConfigEventsBridge,
	initConfigEventsBridge,
} from "./ipc/config-events-bridge";
import {
	disposeExternalTrackingEventsBridge,
	initExternalTrackingEventsBridge,
} from "./ipc/external-tracking-events-bridge";
import {
	disposeGroupExplorerEventsBridge,
	initGroupExplorerEventsBridge,
} from "./ipc/group-explorer-events-bridge";
import {
	disposeHydratorEventsBridge,
	initHydratorEventsBridge,
} from "./ipc/hydrator-events-bridge";
import {
	disposeReleaseWatchEventsBridge,
	initReleaseWatchEventsBridge,
} from "./ipc/release-watch-events-bridge";
import {
	disposeToasterEventsBridge,
	initToasterEventsBridge,
} from "./ipc/toaster-events-bridge";
import {
	disposeCatalogMediaIngestionEvents,
	initCatalogMediaIngestionEvents,
} from "./services/anime-db/catalog-media-ingestion-events";
import { AppUpdateService } from "./services/app-update/app-update-service";
import { disposeExternalTrackingLoopbackCallback } from "./services/external-tracking/external-tracking-loopback-callback";
import {
	disposeImageCacheEvents,
	initImageCacheEvents,
} from "./services/image-cache/image-cache-events";

// Ensure required folders exist before anything else
import "./init/create-folders";

const ELECTRON_DEV_RESTART_MESSAGE = "nimlat-dev-restart";

protocol.registerSchemesAsPrivileged([
	{
		scheme:     LOCAL_IMAGE_PROTOCOL,
		privileges: {
			standard:        true,
			secure:          true,
			supportFetchAPI: true,
			corsEnabled: true,
		},
	},
]);

let db: ReturnType<typeof initDatabases> | null = null;

function exitAfterFatalMainLog(): void {
	setImmediate(() => {
		if (app.isReady()) {
			app.exit(1);
			return;
		}

		process.exit(1);
	});
}

process.on(
	"message",
	(message: unknown) => {
		if (message === ELECTRON_DEV_RESTART_MESSAGE) {
			// Dev rebuilds ask the existing Electron app to close itself so the
			// shutdown lifecycle runs before Vite starts the replacement process.
			app.quit();
		}
	},
);

process.on(
	"unhandledRejection",
	(reason: unknown) => {
		// Daemon and scanner work is intentionally fire-and-forget in a few places.
		// Preserve unexpected promise failures, then fail fast instead of letting
		// a blank renderer keep overwriting the original console evidence.
		LoggerUtils.logMainServiceError(
			"main.unhandled-rejection",
			typeSafeError(reason),
		);
		exitAfterFatalMainLog();
	},
);

process.on(
	"uncaughtExceptionMonitor",
	(error: Error) => {
		LoggerUtils.logMainServiceError(
			"main.uncaught-exception",
			error,
		);
	},
);

app.whenReady()
	.then(() => {
		db = initDatabases();
		LoggerUtils.setDebugLoggingEnabledResolver(() => UserDbFacade.config.isDebuggingModeEnabled());
		setGroupingDiagnosticsLogger((context, error, details) => {
			LoggerUtils.logMainServiceError(
				context,
				error,
				details,
			);
		});
		AppUpdateService.init();
		registerLocalImageProtocol();
		initCatalogMediaIngestionEvents();
		initImageCacheEvents();
		initDaemons();
		initAnimeDbEventsBridge();
		initAppUpdateEventsBridge();
		initAniListQueueEventsBridge();
		initHydratorEventsBridge();
		initGroupExplorerEventsBridge();
		initReleaseWatchEventsBridge();
		initExternalTrackingEventsBridge();
		initConfigEventsBridge();
		initToasterEventsBridge();
		registerIpcMainHandlers();
		createWindow();
	})
	.catch((error: unknown) => {
		const typedError = typeSafeError(error);
		LoggerUtils.logMainInitializationError(
			typedError,
		);
		app.quit();
	});

app.on(
	"before-quit",
	() => {
		// Stop background schedulers before Electron starts closing windows. Window close
		// handlers still need the database for final state persistence during this phase.
		void disposeExternalTrackingLoopbackCallback();
		disposeDaemons();
		disposeAnimeDbEventsBridge();
		disposeAppUpdateEventsBridge();
		disposeAniListQueueEventsBridge();
		disposeHydratorEventsBridge();
		disposeGroupExplorerEventsBridge();
		disposeReleaseWatchEventsBridge();
		disposeExternalTrackingEventsBridge();
		disposeConfigEventsBridge();
		disposeToasterEventsBridge();
		disposeImageCacheEvents();
		disposeCatalogMediaIngestionEvents();
	},
);

app.on(
	"will-quit",
	() => {
		// Keep SQLite open through BrowserWindow close events, then release it once no
		// app code should still be saving renderer-visible state.
		if (db?.open) {
			db.close();
		}
		db = null;
	},
);

app.on(
	"window-all-closed",
	() => {
		if (process.platform !== "darwin") app.quit();
	},
);
