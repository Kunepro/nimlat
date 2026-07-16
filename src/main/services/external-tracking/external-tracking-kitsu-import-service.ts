import type {
	ExternalTrackingImportResult,
	ImportKitsuPublicProfileRequest,
} from "@nimlat/types/external-tracking";
import { dialog } from "electron";
import {
	readFile,
	stat,
} from "node:fs/promises";
import { importExternalTrackingFromLoader } from "./external-tracking-import-service";
import { KitsuTrackingClient } from "./external-tracking-kitsu-client";
import { parseKitsuAnimeXml } from "./external-tracking-kitsu-xml";

const MAX_KITSU_XML_BYTES = 10 * 1024 * 1024;

function createCancelledKitsuImportResult(): ExternalTrackingImportResult {
	return {
		success:           false,
		message:           "Kitsu XML import cancelled.",
		importedItems:     0,
		matchedItems:      0,
		localUpdatedItems: 0,
	};
}

export function importKitsuPublicProfile(
	request: ImportKitsuPublicProfileRequest,
): Promise<ExternalTrackingImportResult> {
	const username = request.username.trim();
	return importExternalTrackingFromLoader(
		"kitsu",
		() => new KitsuTrackingClient().importPublicProfile(username),
		"external-tracking.importKitsuPublicProfile",
		{ publicProfileIdentifier: username },
	);
}

export async function importKitsuXmlFile(): Promise<ExternalTrackingImportResult> {
	const selection = await dialog.showOpenDialog({
		title:      "Import Kitsu anime XML",
		properties: [ "openFile" ],
		filters:    [
			{
				name:       "Kitsu anime XML",
				extensions: [ "xml" ],
			},
		],
	});
	const filePath  = selection.filePaths[ 0 ];
	if (selection.canceled || !filePath) return createCancelledKitsuImportResult();

	return importExternalTrackingFromLoader(
		"kitsu",
		async () => {
			const metadata = await stat(filePath);
			if (!metadata.isFile()) throw new Error("The selected Kitsu XML path is not a file.");
			if (metadata.size > MAX_KITSU_XML_BYTES) {
				throw new Error("The selected Kitsu XML exceeds the 10 MB safety limit.");
			}
			return parseKitsuAnimeXml(await readFile(
				filePath,
				"utf8",
			));
		},
		"external-tracking.importKitsuXml",
	);
}
