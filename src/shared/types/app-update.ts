export interface AppVersionInfo {
	releaseNumber: number;
	technicalVersion: string;
	displayVersion: string;
}

export type AppUpdateStatus =
	| {
	state: "idle";
	version: AppVersionInfo;
}
	| {
	state: "not-supported";
	version: AppVersionInfo;
	reason: string;
}
	| {
	state: "checking";
	version: AppVersionInfo;
}
	| {
	state: "available";
	version: AppVersionInfo;
	latestVersion: AppVersionInfo;
}
	| {
	state: "not-available";
	version: AppVersionInfo;
}
	| {
	state: "downloading";
	version: AppVersionInfo;
	latestVersion: AppVersionInfo;
	percent: number;
	transferredBytes?: number;
	totalBytes?: number;
}
	| {
	state: "downloaded";
	version: AppVersionInfo;
	latestVersion: AppVersionInfo;
}
	| {
	state: "error";
	version: AppVersionInfo;
	message: string;
};
