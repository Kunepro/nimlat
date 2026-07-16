export interface RendererImageFetchRequest {
	imageUrl: string;
}

export interface RendererLocalImageFetchRequest {
	localPath: string;
}

export interface RendererImageFetchResponse {
	bytes: ArrayBuffer;
	contentType: string;
}
