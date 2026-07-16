import { BUS_GroupListChanged } from "@nimlat/busses/main";
import {
	AnimeDbFacade,
	UserDbFacade,
} from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	GroupImageSelectionResult,
	GroupInspectionSummary,
	GroupUpdateDetailsActionResult,
	SaveGroupEditRequest,
	UpdateGroupDetailsRequest,
} from "@nimlat/types/ipc-payloads";
import {
	BrowserWindow,
	dialog,
} from "electron";
import { Toaster } from "../../utils/toaster";
import { ImageGalleryService } from "../image-cache/image-gallery-service";

type GroupDetailsRollbackSnapshot = Pick<GroupInspectionSummary, "description" | "imageUrl" | "name">;

// Renderer-facing service for manual Group metadata editing.
// File system writes for gallery uploads stay in the dedicated image-gallery path.
// This service now only owns text metadata edits plus the shared image picker dialog.
export class GroupEditService {
	public static async pickImage(): Promise<GroupImageSelectionResult> {
		const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[ 0 ];
		const result = await dialog.showOpenDialog(
			window,
			{
				title:      "Choose Group image",
				properties: [ "openFile" ],
				filters:    [
					{
						name:       "Images",
						extensions: [
							"png",
							"jpg",
							"jpeg",
							"webp",
							"gif",
							"bmp",
						],
					},
				],
			},
		);

		if (result.canceled || result.filePaths.length === 0) {
			return {
				success:  false,
				canceled: true,
			};
		}

		return {
			success:   true,
			imagePath: result.filePaths[ 0 ],
		};
	}

	public static updateDetails(request: UpdateGroupDetailsRequest): GroupUpdateDetailsActionResult {
		const nextName        = request.name.trim();
		const nextDescription = request.description?.trim() ?? "";
		try {
			this.persistDetails(
				request,
				nextName,
				nextDescription,
			);

			BUS_GroupListChanged.next({ affectedGroups: [ request.group ] });
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"group-edit.update-details",
				tsError,
				{ groupId: request.group.groupId },
			);
			Toaster.error("Failed to update group.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	// Persist text metadata and active image selections as one rollback-aware edit.
	// Uploaded image candidates are already stored before this point; only the active selection is committed here.
	public static saveEdit(request: SaveGroupEditRequest): GroupUpdateDetailsActionResult {
		const nextName        = request.name.trim();
		const nextDescription = request.description?.trim() ?? "";

		try {
			const previousOfficialOverride = request.group.source === "official"
				? UserDbFacade.overrides.group.get(request.group.groupId)
				: null;
			const previousOfficialGroup = this.readOfficialGroupRollbackSnapshot(request);
			const previousUserGroup     = this.readUserGroupRollbackSnapshot(request);
			const previousSelections       = ImageGalleryService.getGroupSelectionSnapshot(request.group);
			this.persistDetails(
				request,
				nextName,
				nextDescription,
			);
			try {
				ImageGalleryService.applyGroupSelections(
					request.group,
					request.selections,
				);
				BUS_GroupListChanged.next({ affectedGroups: [ request.group ] });
			} catch (postDetailsError) {
				this.rollbackEdit(
					request,
					previousOfficialOverride,
					previousOfficialGroup,
					previousUserGroup,
					previousSelections,
				);
				throw postDetailsError;
			}
			return { success: true };
		} catch (error) {
			const tsError = typeSafeError(error);
			LoggerUtils.logMainServiceError(
				"group-edit.save-edit",
				tsError,
				{ group: request.group },
			);
			Toaster.error("Failed to save group edit.");
			return {
				success: false,
				error:   tsError.message,
			};
		}
	}

	private static persistDetails(request: UpdateGroupDetailsRequest, nextName: string, nextDescription: string): void {
		if (this.isAdminOfficialGroupEdit(request)) {
			// Admin curation edits are part of the distributable AnimeDB, not a user overlay.
			AnimeDbFacade.updateGroupDetails(
				request.group.groupId,
				{
					name:        nextName,
					description: nextDescription,
				},
			);
			return;
		}

		if (request.group.source === "user") {
			UserDbFacade.grouping.updateGroupDetails(
				request.group.groupId,
				{
					name:        nextName,
					description: nextDescription,
				},
			);
			return;
		}

		UserDbFacade.overrides.group.save({
			animeGroupId: request.group.groupId,
			name:         nextName,
			description:  nextDescription,
			imageUrl:     null,
			updatedAt:    Date.now(),
		});
	}

	private static rollbackEdit(
		request: SaveGroupEditRequest,
		previousOfficialOverride: ReturnType<typeof UserDbFacade.overrides.group.get>,
		previousOfficialGroup: GroupDetailsRollbackSnapshot | null,
		previousUserGroup: GroupDetailsRollbackSnapshot | null,
		previousSelections: ReturnType<typeof ImageGalleryService.getGroupSelectionSnapshot>,
	): void {
		try {
			if (this.isAdminOfficialGroupEdit(request)) {
				if (!previousOfficialGroup) {
					throw new Error(`Cannot roll back missing official group ${ request.group.groupId }.`);
				}
				AnimeDbFacade.updateGroupDetails(
					request.group.groupId,
					{
						name:        previousOfficialGroup.name,
						description: previousOfficialGroup.description,
						imageUrl:    previousOfficialGroup.imageUrl,
					},
				);
			} else if (request.group.source === "user") {
				if (!previousUserGroup) {
					throw new Error(`Cannot roll back missing user group ${ request.group.groupId }.`);
				}
				UserDbFacade.grouping.updateGroupDetails(
					request.group.groupId,
					{
						name:        previousUserGroup.name,
						description: previousUserGroup.description,
						imageUrl:    previousUserGroup.imageUrl,
					},
				);
			} else if (previousOfficialOverride) {
				UserDbFacade.overrides.group.save(previousOfficialOverride);
			} else {
				UserDbFacade.overrides.group.delete(request.group.groupId);
			}
			ImageGalleryService.applyGroupSelections(
				request.group,
				previousSelections,
			);
		} catch (rollbackError) {
			LoggerUtils.logMainServiceError(
				"group-edit.save-edit.rollback",
				typeSafeError(rollbackError),
				{ group: request.group },
			);
		}
	}

	private static isAdminOfficialGroupEdit(request: UpdateGroupDetailsRequest): boolean {
		return request.group.source === "official" && UserDbFacade.config.isAdminModeEnabled();
	}

	private static readOfficialGroupRollbackSnapshot(request: SaveGroupEditRequest): GroupDetailsRollbackSnapshot | null {
		if (!this.isAdminOfficialGroupEdit(request)) {
			return null;
		}
		return AnimeDbFacade.group.getInspectionSummary(request.group.groupId);
	}

	private static readUserGroupRollbackSnapshot(request: SaveGroupEditRequest): GroupDetailsRollbackSnapshot | null {
		if (request.group.source !== "user") {
			return null;
		}
		return UserDbFacade.grouping.getInspectionSummary(request.group.groupId);
	}
}
