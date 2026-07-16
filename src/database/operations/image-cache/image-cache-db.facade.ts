import {
	CachedImageEntryDto,
	ImageOwnerKind,
	ImageRole,
	UserLocalImageEntryDto,
} from "@nimlat/types/anime-db";
import { runDatabaseFacadeOperation } from "../database-facade-utils";
import { deleteCachedImageEntryByKey } from "./delete-cached-image-entry-by-key";
import { deleteUserLocalImageEntry } from "./delete-user-local-image-entry";
import { markCachedImageFailed } from "./mark-cached-image-failed";
import { markCachedImageReady } from "./mark-cached-image-ready";
import { selectCachedImageEntriesByOwnerRole } from "./select-cached-image-entries-by-owner-role";
import { selectCachedImageEntryByKey } from "./select-cached-image-entry-by-key";
import { selectUserLocalImageEntry } from "./select-user-local-image-entry";
import { upsertCachedImagePending } from "./upsert-cached-image-pending";
import { upsertUserLocalImageEntry } from "./upsert-user-local-image-entry";

// Thin DB boundary for app-owned local image-cache bookkeeping.
// File IO and network fetching stay in main services; this facade only persists cache state.
export class ImageCacheDbFacade {
	public static getByCacheKey(cacheKey: string): CachedImageEntryDto | null {
		return runDatabaseFacadeOperation(
			"image-cache-db.facade.getByCacheKey",
			() => selectCachedImageEntryByKey(cacheKey),
			{ cacheKey },
		);
	}

	public static listByOwnerRole(
		ownerKind: ImageOwnerKind,
		ownerId: string,
		imageRole: ImageRole,
	): CachedImageEntryDto[] {
		return runDatabaseFacadeOperation(
			"image-cache-db.facade.listByOwnerRole",
			() => selectCachedImageEntriesByOwnerRole(
				ownerKind,
				ownerId,
				imageRole,
			),
			{
				ownerKind,
				ownerId,
				imageRole,
			},
		);
	}

	public static deleteByCacheKey(cacheKey: string): void {
		runDatabaseFacadeOperation(
			"image-cache-db.facade.deleteByCacheKey",
			() => deleteCachedImageEntryByKey(cacheKey),
			{ cacheKey },
		);
	}

	public static ensurePending(params: {
		cacheKey: string;
		ownerKind: ImageOwnerKind;
		ownerId: string;
		imageRole: ImageRole;
		remoteUrl: string;
	}): void {
		runDatabaseFacadeOperation(
			"image-cache-db.facade.ensurePending",
			() => upsertCachedImagePending(params),
			params,
		);
	}

	public static markReady(cacheKey: string, localPath: string): void {
		runDatabaseFacadeOperation(
			"image-cache-db.facade.markReady",
			() => markCachedImageReady(
				cacheKey,
				localPath,
			),
			{
				cacheKey,
				localPath,
			},
		);
	}

	public static markFailed(cacheKey: string, errorMessage: string): void {
		runDatabaseFacadeOperation(
			"image-cache-db.facade.markFailed",
			() => markCachedImageFailed(
				cacheKey,
				errorMessage,
			),
			{
				cacheKey,
				errorMessage,
			},
		);
	}

	public static getUserLocalImage(
		ownerKind: ImageOwnerKind,
		ownerId: string,
		imageRole: ImageRole,
	): UserLocalImageEntryDto | null {
		return runDatabaseFacadeOperation(
			"image-cache-db.facade.getUserLocalImage",
			() => selectUserLocalImageEntry(
				ownerKind,
				ownerId,
				imageRole,
			),
			{
				ownerKind,
				ownerId,
				imageRole,
			},
		);
	}

	public static saveUserLocalImage(input: {
		ownerKind: ImageOwnerKind;
		ownerId: string;
		imageRole: ImageRole;
		localPath: string;
	}): void {
		runDatabaseFacadeOperation(
			"image-cache-db.facade.saveUserLocalImage",
			() => upsertUserLocalImageEntry(input),
			input,
		);
	}

	public static deleteUserLocalImage(ownerKind: ImageOwnerKind, ownerId: string, imageRole: ImageRole): void {
		runDatabaseFacadeOperation(
			"image-cache-db.facade.deleteUserLocalImage",
			() => deleteUserLocalImageEntry(
				ownerKind,
				ownerId,
				imageRole,
			),
			{
				ownerKind,
				ownerId,
				imageRole,
			},
		);
	}
}
