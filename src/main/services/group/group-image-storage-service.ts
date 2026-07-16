import {
	PATH_DATA,
	PATH_EPISODE_USER_IMAGES,
	PATH_GROUP_USER_IMAGES,
	PATH_MEDIA_USER_IMAGES,
} from "@nimlat/constants/main/system-folders";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import { ImageRole } from "@nimlat/types/anime-db";
import { randomUUID } from "crypto";
import { nativeImage } from "electron";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "fs";
import {
	extname,
	isAbsolute,
	join,
	relative,
	resolve,
} from "path";

const LEGACY_GROUP_USER_IMAGES   = join(
	PATH_DATA,
	"group-images",
);
const LEGACY_MEDIA_USER_IMAGES   = join(
	PATH_DATA,
	"media-images",
);
const LEGACY_EPISODE_USER_IMAGES = join(
	PATH_DATA,
	"episode-images",
);
const OPTIMIZED_UPLOAD_EXTENSION = ".jpg";
const OPTIMIZED_UPLOAD_QUALITY = 82;
const OPTIMIZED_UPLOAD_BOUNDS_BY_ROLE: Record<ImageRole, {
	width: number;
	height: number;
}>                             = {
	primary:   {
		width:  408,
		height: 586,
	},
	banner:    {
		width:  1280,
		height: 480,
	},
	thumbnail: {
		width:  408,
		height: 230,
	},
};

/**
 * Store a user-selected Group image inside the app-owned data directory and return its absolute path.
 */
function storeManagedImage(sourceImagePath: string, targetFolderPath: string): string {
	const extension       = extname(sourceImagePath) || ".png";
	const destinationPath = join(
		targetFolderPath,
		`${ randomUUID() }${ extension }`,
	);

	copyFileSync(
		sourceImagePath,
		destinationPath,
	);

	return destinationPath;
}

function createRoleOptimizedImageBuffer(sourceImagePath: string, imageRole: ImageRole): Buffer {
	const sourceImage = nativeImage.createFromBuffer(readFileSync(sourceImagePath));
	if (sourceImage.isEmpty()) {
		throw new Error("Uploaded image could not be decoded.");
	}

	const bounds = OPTIMIZED_UPLOAD_BOUNDS_BY_ROLE[ imageRole ];
	const size   = sourceImage.getSize();
	if (size.width <= 0 || size.height <= 0) {
		throw new Error("Uploaded image has invalid dimensions.");
	}

	const targetRatio = bounds.width / bounds.height;
	const sourceRatio = size.width / size.height;
	const cropWidth   = sourceRatio > targetRatio
		? Math.max(
			1,
			Math.round(size.height * targetRatio),
		)
		: size.width;
	const cropHeight  = sourceRatio > targetRatio
		? size.height
		: Math.max(
			1,
			Math.round(size.width / targetRatio),
		);
	const cropped     = sourceImage.crop({
		x:      Math.max(
			0,
			Math.floor((size.width - cropWidth) / 2),
		),
		y:      Math.max(
			0,
			Math.floor((size.height - cropHeight) / 2),
		),
		width:  cropWidth,
		height: cropHeight,
	});
	const scale       = Math.min(
		1,
		bounds.width / cropWidth,
		bounds.height / cropHeight,
	);
	const outputImage = scale < 1
		? cropped.resize({
			width:   Math.max(
				1,
				Math.round(cropWidth * scale),
			),
			height:  Math.max(
				1,
				Math.round(cropHeight * scale),
			),
			quality: "best",
		})
		: cropped;
	const buffer      = outputImage.toJPEG(OPTIMIZED_UPLOAD_QUALITY);
	if (buffer.byteLength <= 0) {
		throw new Error("Uploaded image optimization produced empty bytes.");
	}

	return buffer;
}

/*
 * Gallery uploads are normalized on write so renderer previews and persisted selections
 * keep the same role-specific proportions as provider images.
 */
function storeManagedGalleryImage(sourceImagePath: string, targetFolderPath: string, imageRole: ImageRole): string {
	mkdirSync(
		targetFolderPath,
		{ recursive: true },
	);
	const destinationPath = join(
		targetFolderPath,
		`${ randomUUID() }${ OPTIMIZED_UPLOAD_EXTENSION }`,
	);
	writeFileSync(
		destinationPath,
		createRoleOptimizedImageBuffer(
			sourceImagePath,
			imageRole,
		),
	);

	return destinationPath;
}

export function storeGroupImage(sourceImagePath: string, imageRole?: ImageRole): string {
	return imageRole ? storeManagedGalleryImage(
		sourceImagePath,
		PATH_GROUP_USER_IMAGES,
		imageRole,
	) : storeManagedImage(
		sourceImagePath,
		PATH_GROUP_USER_IMAGES,
	);
}

export function storeMediaImage(sourceImagePath: string, imageRole?: ImageRole): string {
	return imageRole ? storeManagedGalleryImage(
		sourceImagePath,
		PATH_MEDIA_USER_IMAGES,
		imageRole,
	) : storeManagedImage(
		sourceImagePath,
		PATH_MEDIA_USER_IMAGES,
	);
}

export function storeEpisodeImage(sourceImagePath: string, imageRole?: ImageRole): string {
	return imageRole ? storeManagedGalleryImage(
		sourceImagePath,
		PATH_EPISODE_USER_IMAGES,
		imageRole,
	) : storeManagedImage(
		sourceImagePath,
		PATH_EPISODE_USER_IMAGES,
	);
}

function isInsideManagedRoot(normalizedImagePath: string, rootFolderPath: string): boolean {
	const relativePath = relative(
		resolve(rootFolderPath),
		normalizedImagePath,
	);
	return Boolean(relativePath)
		&& !relativePath.startsWith("..")
		&& !isAbsolute(relativePath);
}

/*
 * Delete a previously stored app-owned image when it is replaced.
 * External paths are ignored to avoid touching user files outside the app data directory.
 * Old pre-rename folders are accepted only for deletion so existing local overrides remain manageable.
 */
function deleteOwnedManagedImageIfPresent(imagePath: string | undefined, rootFolderPaths: string[], loggerKey: string): void {
	if (!imagePath) {
		return;
	}

	const normalizedImagePath = resolve(imagePath);
	const isManagedPath = rootFolderPaths.some((rootFolderPath) => isInsideManagedRoot(
		normalizedImagePath,
		rootFolderPath,
	));
	if (!isManagedPath) {
		return;
	}

	try {
		if (existsSync(normalizedImagePath)) {
			rmSync(normalizedImagePath);
		}
	} catch (error) {
		LoggerUtils.logMainServiceError(
			loggerKey,
			typeSafeError(error),
			{ imagePath: normalizedImagePath },
		);
	}
}

export function deleteOwnedGroupImageIfPresent(imagePath?: string): void {
	deleteOwnedManagedImageIfPresent(
		imagePath,
		[
			PATH_GROUP_USER_IMAGES,
			LEGACY_GROUP_USER_IMAGES,
		],
		"group-image-storage.delete-owned-group-image",
	);
}

export function deleteOwnedMediaImageIfPresent(imagePath?: string): void {
	deleteOwnedManagedImageIfPresent(
		imagePath,
		[
			PATH_MEDIA_USER_IMAGES,
			LEGACY_MEDIA_USER_IMAGES,
		],
		"group-image-storage.delete-owned-media-image",
	);
}

export function deleteOwnedEpisodeImageIfPresent(imagePath?: string): void {
	deleteOwnedManagedImageIfPresent(
		imagePath,
		[
			PATH_EPISODE_USER_IMAGES,
			LEGACY_EPISODE_USER_IMAGES,
		],
		"group-image-storage.delete-owned-episode-image",
	);
}
