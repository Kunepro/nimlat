import type { AppVersionInfo } from "@nimlat/types/app-update";

export function getAppReleaseNumber(technicalVersion: string): number {
	const majorVersionText = technicalVersion.split(".")[ 0 ];
	const releaseNumber    = Number.parseInt(
		majorVersionText,
		10,
	);

	return Number.isFinite(releaseNumber) && releaseNumber >= 0
		? releaseNumber
		: 0;
}

export function formatAppDisplayVersion(technicalVersion: string): string {
	return `Version ${ getAppReleaseNumber(technicalVersion) }`;
}

export function createAppVersionInfo(technicalVersion: string): AppVersionInfo {
	return {
		technicalVersion,
		releaseNumber:  getAppReleaseNumber(technicalVersion),
		displayVersion: formatAppDisplayVersion(technicalVersion),
	};
}
