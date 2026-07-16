import type {
	MediaImageGallerySourceDto,
	MediaImagePreviewDto,
} from "@nimlat/types/anime-db";
import type { ProviderCandidateInput } from "./image-gallery-model";

type CoverImage = {
	extraLarge?: string;
	large?: string;
	medium?: string;
};

function isRemoteUrl(imageUrl?: string): imageUrl is string {
	return Boolean(imageUrl && /^(https?:)?\/\//i.test(imageUrl));
}

function safeParseCoverImage(json?: string | null): CoverImage | undefined {
	try {
		return json ? JSON.parse(json) as CoverImage : undefined;
	} catch {
		return undefined;
	}
}

function pushUniqueProviderCandidate(
	target: ProviderCandidateInput[],
	seenUrls: Set<string>,
	candidate?: ProviderCandidateInput,
): void {
	if (!candidate?.imageUrl || seenUrls.has(candidate.imageUrl)) {
		return;
	}

	seenUrls.add(candidate.imageUrl);
	target.push(candidate);
}

export function buildMediaGalleryProviderCandidates(source: MediaImageGallerySourceDto | null): {
	portraitProviders: ProviderCandidateInput[];
	bannerProviders: ProviderCandidateInput[];
} {
	if (!source) {
		return {
			portraitProviders: [],
			bannerProviders:   [],
		};
	}

	// Media editing starts from a canonical catalog row. Reuse its resolved portrait
	// and banner fields so the gallery cannot disagree with detail/card readers.
	return {
		portraitProviders: source.imageUrl
												 ? [
				{
					role:     "portrait",
					label:    "Current media portrait",
					imageUrl: source.imageUrl,
				},
			]
												 : [],
		bannerProviders:   source.bannerImage
												 ? [
				{
					role:     "banner",
					label:    "Current media banner",
					imageUrl: source.bannerImage,
				},
			]
												 : [],
	};
}

export function buildGroupProviderCandidates(
	groupImageUrl: string | undefined,
	previews: MediaImagePreviewDto[],
): ProviderCandidateInput[] {
	const candidates: ProviderCandidateInput[] = [];
	const seenPortraitUrls                     = new Set<string>();
	const seenBannerUrls                       = new Set<string>();

	if (isRemoteUrl(groupImageUrl)) {
		pushUniqueProviderCandidate(
			candidates,
			seenPortraitUrls,
			{
				role:     "portrait",
				label:    "Current group portrait",
				imageUrl: groupImageUrl,
			},
		);
	}

	previews.forEach((preview) => {
		const mediaLabel = preview.name || `Media ${ preview.mediaId }`;
		const coverImage = safeParseCoverImage(preview.coverImageJson);
		pushUniqueProviderCandidate(
			candidates,
			seenPortraitUrls,
			coverImage?.extraLarge
				? {
					role:     "portrait",
					label:    `${ mediaLabel } portrait XL`,
					imageUrl: coverImage.extraLarge,
				}
				: undefined,
		);
		pushUniqueProviderCandidate(
			candidates,
			seenPortraitUrls,
			coverImage?.large
				? {
					role:     "portrait",
					label:    `${ mediaLabel } portrait L`,
					imageUrl: coverImage.large,
				}
				: undefined,
		);
		pushUniqueProviderCandidate(
			candidates,
			seenPortraitUrls,
			coverImage?.medium
				? {
					role:     "portrait",
					label:    `${ mediaLabel } portrait M`,
					imageUrl: coverImage.medium,
				}
				: undefined,
		);
		pushUniqueProviderCandidate(
			candidates,
			seenBannerUrls,
			preview.bannerImage
				? {
					role:     "banner",
					label:    `${ mediaLabel } banner`,
					imageUrl: preview.bannerImage,
				}
				: undefined,
		);
	});

	return candidates;
}
