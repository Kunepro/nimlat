import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import { DisplayImageOrientation } from "@nimlat/types/anime-db";
import { nativeImage } from "electron";
import {
	existsSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";

interface CachedImageMetadata {
	width: number;
	height: number;
	orientation: DisplayImageOrientation;
}

const METADATA_FILE_SUFFIX = ".nimlat-meta.json";

function getMetadataFilePath(localPath: string): string {
	return `${ localPath }${ METADATA_FILE_SUFFIX }`;
}

function resolveOrientation(width: number, height: number): DisplayImageOrientation {
	if (width === height) {
		return "square";
	}

	return width > height ? "landscape" : "portrait";
}

function readPersistedMetadata(localPath: string): CachedImageMetadata | null {
	const metadataPath = getMetadataFilePath(localPath);
	if (!existsSync(metadataPath)) {
		return null;
	}

	try {
		const parsed = JSON.parse(readFileSync(
			metadataPath,
			"utf8",
		)) as Partial<CachedImageMetadata>;
		if (typeof parsed.width !== "number" || typeof parsed.height !== "number" || typeof parsed.orientation !== "string") {
			return null;
		}

		return {
			width:       parsed.width,
			height:      parsed.height,
			orientation: parsed.orientation,
		};
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"image-cache.read-metadata",
			typeSafeError(error),
			{ localPath },
		);
		return null;
	}
}

function persistMetadata(localPath: string, metadata: CachedImageMetadata): void {
	try {
		writeFileSync(
			getMetadataFilePath(localPath),
			JSON.stringify(metadata),
			"utf8",
		);
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"image-cache.persist-metadata",
			typeSafeError(error),
			{
				localPath,
				orientation: metadata.orientation,
			},
		);
	}
}

// Cache downloads can later be reused in large virtualized grids; store dimensions once on disk so
// the renderer does not need to probe image layout repeatedly during scrolling.
export function resolveOrPersistCachedImageMetadata(localPath: string): CachedImageMetadata | null {
	const persisted = readPersistedMetadata(localPath);
	if (persisted) {
		return persisted;
	}

	const image = nativeImage.createFromPath(localPath);
	if (image.isEmpty()) {
		return null;
	}

	const {
					width,
					height,
				} = image.getSize();
	if (width <= 0 || height <= 0) {
		return null;
	}

	const metadata: CachedImageMetadata = {
		width,
		height,
		orientation: resolveOrientation(
			width,
			height,
		),
	};
	persistMetadata(
		localPath,
		metadata,
	);
	return metadata;
}

export function deleteCachedImageMetadata(localPath: string): void {
	const metadataPath = getMetadataFilePath(localPath);
	if (!existsSync(metadataPath)) {
		return;
	}

	try {
		rmSync(metadataPath);
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"image-cache.delete-metadata",
			typeSafeError(error),
			{ localPath },
		);
	}
}
