const BROKEN_MEDIA_IMAGE_PORTRAIT_URL = `data:image/svg+xml;charset=UTF-8,${ encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 960">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#07111c"/>
      <stop offset="100%" stop-color="#10263b"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00E1FF"/>
      <stop offset="100%" stop-color="#007BFF"/>
    </linearGradient>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="640" height="960" rx="26" fill="url(#bg)"/>
  <rect x="28" y="28" width="584" height="904" rx="22" fill="none" stroke="#00CFFF" stroke-opacity="0.35" stroke-width="3"/>
  <path d="M116 744L256 584L380 696L470 616L546 744Z" fill="none" stroke="url(#glow)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" filter="url(#softGlow)"/>
  <circle cx="228" cy="300" r="54" fill="none" stroke="#7FE7FF" stroke-width="16" filter="url(#softGlow)"/>
  <path d="M196 196L444 444M444 196L196 444" stroke="#F7B84B" stroke-width="18" stroke-linecap="round" filter="url(#softGlow)"/>
  <text x="320" y="830" text-anchor="middle" fill="#C9F6FF" font-family="Segoe UI, sans-serif" font-size="44" letter-spacing="6">IMAGE ERROR</text>
  <text x="320" y="878" text-anchor="middle" fill="#73B9D9" font-family="Segoe UI, sans-serif" font-size="24" letter-spacing="3">LOCAL FILE MISSING</text>
</svg>
`) }`;
const LOCAL_IMAGE_PROTOCOL            = "nimlat-image://local";

function toLocalImageProtocolUrl(localPath: string): string {
	return `${ LOCAL_IMAGE_PROTOCOL }?path=${ encodeURIComponent(localPath) }`;
}

// Normalize renderer image sources so remote URLs and local absolute paths both render correctly.
export function resolveImageSrc(imageUrl?: string): string | undefined {
	if (!imageUrl) {
		return undefined;
	}

	if (imageUrl === "nimlat://broken-media-image-portrait") {
		return BROKEN_MEDIA_IMAGE_PORTRAIT_URL;
	}

	if (imageUrl.startsWith("//")) {
		return `https:${ imageUrl }`;
	}

	if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:") || imageUrl.startsWith("nimlat-image://")) {
		return imageUrl;
	}

	if (imageUrl.startsWith("file:")) {
		return toLocalImageProtocolUrl(imageUrl.replace(
			/^file:\/\/\/?/i,
			"",
		));
	}

	return toLocalImageProtocolUrl(imageUrl);
}
