import type {
	ImageGalleryRole,
	ImageRole,
} from "@nimlat/types/anime-db";
import type { ImageGalleryCandidate } from "@nimlat/types/ipc-payloads";

export type ProviderCandidateInput = {
	role: ImageGalleryRole;
	label: string;
	imageUrl: string;
};

export type OwnerTarget = {
	ownerKind: "media" | "official_group" | "user_group" | "episode";
	ownerId: string;
	storeUpload: (sourceImagePath: string, imageRole: ImageRole) => string;
	deleteOwnedImage: (localPath?: string) => void;
};

export function mapGalleryRoleToImageRole(role: ImageGalleryRole): ImageRole {
	if (role === "portrait") {
		return "primary";
	}
	if (role === "banner") {
		return "banner";
	}

	return "thumbnail";
}

export function createProviderCandidateKey(imageUrl: string): string {
	return `provider:${ imageUrl }`;
}

export function createUploadedCandidateKey(id: number): string {
	return `upload:${ id }`;
}

export function parseProviderCandidateKey(candidateKey: string): string | null {
	return candidateKey.startsWith("provider:")
		? candidateKey.slice("provider:".length)
		: null;
}

export function parseUploadedCandidateKey(candidateKey: string): number | null {
	if (!candidateKey.startsWith("upload:")) {
		return null;
	}

	const parsedId = Number(candidateKey.slice("upload:".length));
	return Number.isFinite(parsedId)
		? parsedId
		: null;
}

export function getDefaultActiveCandidateKey(
	role: ImageGalleryRole,
	providerCandidates: ImageGalleryCandidate[],
	uploadedCandidates: ImageGalleryCandidate[],
	explicitActiveKey?: string,
): string | undefined {
	if (explicitActiveKey) {
		return explicitActiveKey;
	}

	const firstUploaded = uploadedCandidates.find((candidate) => candidate.role === role);
	if (firstUploaded) {
		return firstUploaded.candidateKey;
	}

	return providerCandidates.find((candidate) => candidate.role === role)?.candidateKey;
}
