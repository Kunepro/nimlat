import type { Texture as PixiTexture } from "pixi.js";
import { Texture } from "pixi.js";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

vi.mock(
	"pixi.js",
	() => ({
		Texture: {
			from: vi.fn(),
		},
	}),
);

const {
				loadPixiThumbnailTexture,
				unloadPixiThumbnailTexture,
			}                         = await import("./pixi-thumbnail-texture-loader");
const originalCreateImageBitmap = globalThis.createImageBitmap;
const originalCreateObjectUrl   = URL.createObjectURL;
const originalRevokeObjectUrl   = URL.revokeObjectURL;
const originalCreateElement     = document.createElement.bind(document);

function createTexture(): PixiTexture {
	return {
		destroyed: false,
		height:    240,
		width:     160,
		destroy:   vi.fn(),
	} as unknown as PixiTexture;
}

function mockCanvas(): {
	canvas: HTMLCanvasElement;
	drawImage: ReturnType<typeof vi.fn>;
} {
	const drawImage = vi.fn();
	const canvas    = {
		height:     0,
		width:      0,
		getContext: vi.fn(() => ({
			drawImage,
		})),
	} as unknown as HTMLCanvasElement;

	vi.spyOn(
		document,
		"createElement",
	).mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
		if (tagName === "canvas") {
			return canvas as HTMLElement;
		}
		return originalCreateElement(
			tagName,
			options,
		);
	}) as typeof document.createElement);

	return {
		canvas,
		drawImage,
	};
}

function installImageBitmapTextureMocks(): {
	canvas: HTMLCanvasElement;
	closeImageBitmap: ReturnType<typeof vi.fn>;
	createImageBitmapMock: ReturnType<typeof vi.fn>;
	drawImage: ReturnType<typeof vi.fn>;
	imageBitmap: ImageBitmap;
	texture: PixiTexture;
} {
	const texture               = createTexture();
	const closeImageBitmap      = vi.fn();
	const imageBitmap           = {
		close:  closeImageBitmap,
		height: 240,
		width:  160,
	} as unknown as ImageBitmap;
	const createImageBitmapMock = vi.fn(async () => imageBitmap);
	Object.defineProperty(
		globalThis,
		"createImageBitmap",
		{
			configurable: true,
			value:        createImageBitmapMock,
		},
	);
	vi.mocked(Texture.from).mockReturnValue(texture);
	const {
					canvas,
					drawImage,
				} = mockCanvas();

	return {
		canvas,
		closeImageBitmap,
		createImageBitmapMock,
		drawImage,
		imageBitmap,
		texture,
	};
}

describe(
	"pixi thumbnail texture loader",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
			vi.clearAllMocks();
			vi.unstubAllGlobals();
			if (originalCreateImageBitmap) {
				Object.defineProperty(
					globalThis,
					"createImageBitmap",
					{
						configurable: true,
						value:        originalCreateImageBitmap,
					},
				);
			} else {
				Reflect.deleteProperty(
					globalThis,
					"createImageBitmap",
				);
			}
			if (originalCreateObjectUrl) {
				Object.defineProperty(
					URL,
					"createObjectURL",
					{
						configurable: true,
						value:        originalCreateObjectUrl,
					},
				);
			} else {
				Reflect.deleteProperty(
					URL,
					"createObjectURL",
				);
			}
			if (originalRevokeObjectUrl) {
				Object.defineProperty(
					URL,
					"revokeObjectURL",
					{
						configurable: true,
						value:        originalRevokeObjectUrl,
					},
				);
			} else {
				Reflect.deleteProperty(
					URL,
					"revokeObjectURL",
				);
			}
			Reflect.deleteProperty(
				window,
				"electronAPI",
			);
		});

		it(
			"loads bridged remote thumbnails as renderer-owned ImageBitmap textures",
			async () => {
				const fetchRemoteImage = vi.fn(async () => ({
					bytes:       new Uint8Array([
						1,
						2,
						3,
					]).buffer,
					contentType: "image/jpeg",
				}));
				Object.defineProperty(
					window,
					"electronAPI",
					{
						configurable: true,
						value:        {
							rendererImages: {
								fetchRemoteImage,
							},
						},
					},
				);
				const {
								canvas,
								closeImageBitmap,
								createImageBitmapMock,
								drawImage,
								imageBitmap,
								texture,
							}         = installImageBitmapTextureMocks();
				const remoteUrl = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/example.jpg";

				await expect(loadPixiThumbnailTexture(remoteUrl)).resolves.toBe(texture);

				expect(fetchRemoteImage).toHaveBeenCalledWith({ imageUrl: remoteUrl });
				expect(createImageBitmapMock).toHaveBeenCalledWith(expect.any(Blob));
				expect(drawImage).toHaveBeenCalledWith(
					imageBitmap,
					0,
					0,
					160,
					240,
				);
				expect(Texture.from).toHaveBeenCalledWith(
					canvas,
					true,
				);
				expect(closeImageBitmap).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"loads local protocol thumbnails through the main image bridge before WebGL texture upload",
			async () => {
				const fetchLocalImage = vi.fn(async () => ({
					bytes:       new Uint8Array([
						1,
						2,
						3,
					]).buffer,
					contentType: "image/jpeg",
				}));
				Object.defineProperty(
					window,
					"electronAPI",
					{
						configurable: true,
						value:        {
							rendererImages: {
								fetchLocalImage,
							},
						},
					},
				);
				const {
								texture,
							} = installImageBitmapTextureMocks();

				await expect(loadPixiThumbnailTexture("nimlat-image://local?path=%2Ftmp%2Fcover.jpg")).resolves.toBe(texture);

				expect(fetchLocalImage).toHaveBeenCalledWith({ localPath: "/tmp/cover.jpg" });
			},
		);

		it(
			"falls back to Blob URL image elements when ImageBitmap is unavailable",
			async () => {
				Reflect.deleteProperty(
					globalThis,
					"createImageBitmap",
				);
				const fetchRemoteImage            = vi.fn(async () => ({
					bytes:       new Uint8Array([
						1,
						2,
						3,
					]).buffer,
					contentType: "image/jpeg",
				}));
				const createdObjectUrls: string[] = [];
				const revokedObjectUrls: string[] = [];
				Object.defineProperty(
					URL,
					"createObjectURL",
					{
						configurable: true,
						value:        vi.fn(() => {
							const objectUrl = `blob:nimlat-test/${ createdObjectUrls.length }`;
							createdObjectUrls.push(objectUrl);
							return objectUrl;
						}),
					},
				);
				Object.defineProperty(
					URL,
					"revokeObjectURL",
					{
						configurable: true,
						value:        vi.fn((objectUrl: string) => {
							revokedObjectUrls.push(objectUrl);
						}),
					},
				);

				class TestImage {
					public crossOrigin                  = "";
					public decoding                     = "";
					public height                       = 240;
					public naturalHeight                = 240;
					public naturalWidth                 = 160;
					public onerror: (() => void) | null = null;
					public onload: (() => void) | null  = null;
					public width                        = 160;
					private currentSrc                  = "";

					public get src(): string {
						return this.currentSrc;
					}

					public set src(value: string) {
						this.currentSrc = value;
						queueMicrotask(() => this.onload?.());
					}
				}

				vi.stubGlobal(
					"Image",
					TestImage,
				);
				vi.mocked(Texture.from).mockReturnValue(createTexture());
				const {
								canvas,
								drawImage,
							} = mockCanvas();
				Object.defineProperty(
					window,
					"electronAPI",
					{
						configurable: true,
						value:        {
							rendererImages: {
								fetchRemoteImage,
							},
						},
					},
				);
				const remoteUrl = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/example.jpg";

				await expect(loadPixiThumbnailTexture(remoteUrl)).resolves.not.toBeNull();

				expect(fetchRemoteImage).toHaveBeenCalledWith({ imageUrl: remoteUrl });
				expect(createdObjectUrls).toEqual([ "blob:nimlat-test/0" ]);
				const loadedImage = drawImage.mock.calls[ 0 ]?.[ 0 ] as TestImage;
				expect(loadedImage.crossOrigin).toBe("anonymous");
				expect(loadedImage.src).toBe("blob:nimlat-test/0");
				expect(drawImage).toHaveBeenCalledWith(
					loadedImage,
					0,
					0,
					160,
					240,
				);
				expect(Texture.from).toHaveBeenCalledWith(
					canvas,
					true,
				);
				expect(revokedObjectUrls).toEqual([ "blob:nimlat-test/0" ]);
			},
		);

		it(
			"destroys live textures during unload",
			async () => {
				const texture = createTexture();

				await unloadPixiThumbnailTexture(
					"cover-a.jpg",
					texture,
				);

				expect(texture.destroy).toHaveBeenCalledWith(true);
			},
		);
	},
);
