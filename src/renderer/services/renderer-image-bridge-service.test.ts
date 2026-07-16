// @vitest-environment node
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

function installRendererImagesApiMock() {
	const remoteResponse = {
		bytes:       new Uint8Array([ 1 ]).buffer,
		contentType: "image/jpeg",
	};
	const localResponse  = {
		bytes:       new Uint8Array([ 2 ]).buffer,
		contentType: "image/png",
	};
	const rendererImages = {
		fetchRemoteImage: vi.fn(async () => remoteResponse),
		fetchLocalImage:  vi.fn(async () => localResponse),
	};

	vi.stubGlobal(
		"window",
		{
			electronAPI: {
				rendererImages,
			},
		},
	);

	return {
		localResponse,
		remoteResponse,
		rendererImages,
	};
}

describe(
	"RendererImageBridgeService",
	() => {
		beforeEach(() => {
			vi.resetModules();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"delegates remote and local image requests to the preload bridge",
			async () => {
				const {
								localResponse,
								remoteResponse,
								rendererImages,
							}                              = installRendererImagesApiMock();
				const { RendererImageBridgeService } = await import("./renderer-image-bridge-service");

				await expect(RendererImageBridgeService.fetchRemoteImage({ imageUrl: "https://example.test/cover.jpg" })).resolves.toBe(remoteResponse);
				await expect(RendererImageBridgeService.fetchLocalImage({ localPath: "/tmp/cover.jpg" })).resolves.toBe(localResponse);
				expect(rendererImages.fetchRemoteImage).toHaveBeenCalledWith({ imageUrl: "https://example.test/cover.jpg" });
				expect(rendererImages.fetchLocalImage).toHaveBeenCalledWith({ localPath: "/tmp/cover.jpg" });
			},
		);

		it(
			"throws a remote bridge error when the preload bridge is unavailable",
			async () => {
				vi.stubGlobal(
					"window",
					{},
				);
				const { RendererImageBridgeService } = await import("./renderer-image-bridge-service");

				await expect(RendererImageBridgeService.fetchRemoteImage({ imageUrl: "https://example.test/cover.jpg" }))
					.rejects
					.toThrow("Renderer image bridge is not available.");
			},
		);

		it(
			"throws a local bridge error when the local preload bridge method is unavailable",
			async () => {
				vi.stubGlobal(
					"window",
					{
						electronAPI: {
							rendererImages: {},
						},
					},
				);
				const { RendererImageBridgeService } = await import("./renderer-image-bridge-service");

				await expect(RendererImageBridgeService.fetchLocalImage({ localPath: "/tmp/cover.jpg" }))
					.rejects
					.toThrow("Renderer local image bridge is not available.");
			},
		);
	},
);
