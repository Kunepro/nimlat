// @vitest-environment node
import {
	mkdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { RendererImageProxyService } from "./renderer-image-proxy-service";

const paths = vi.hoisted(() => ({
	data: `${ process.env.TMPDIR ?? "/tmp" }/nimlat-renderer-image-proxy-test-${ process.pid }/data`,
}));

vi.mock(
	"@nimlat/constants/main/system-folders",
	() => ({
		PATH_DATA: paths.data,
	}),
);

describe(
	"RendererImageProxyService",
	() => {
		beforeEach(() => {
			rmSync(
				paths.data,
				{
					force: true,
					recursive: true,
				},
			);
			mkdirSync(
				paths.data,
				{ recursive: true },
			);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
			rmSync(
				paths.data,
				{
					force: true,
					recursive: true,
				},
			);
		});

		it(
			"rejects non-http image URLs before fetching",
			async () => {
				const fetchMock = vi.fn();
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await expect(RendererImageProxyService.fetchRemoteImage({
					imageUrl: "file:///C:/cover.jpg",
				})).rejects.toThrow("Only HTTP(S) renderer image URLs");
				expect(fetchMock).not.toHaveBeenCalled();
			},
		);

		it(
			"returns remote image bytes and normalized content type",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn(async () => new Response(
						new Uint8Array([
							1,
							2,
							3,
						]),
						{
							headers: {
								"content-type": "image/png; charset=binary",
							},
						},
					)),
				);

				const response = await RendererImageProxyService.fetchRemoteImage({
					imageUrl: "https://example.com/cover.png",
				});

				expect(response.contentType).toBe("image/png");
				expect(Array.from(new Uint8Array(response.bytes))).toEqual([
					1,
					2,
					3,
				]);
			},
		);

		it(
			"normalizes protocol-relative image URLs to HTTPS",
			async () => {
				const fetchMock = vi.fn(async () => new Response(
					new Uint8Array([ 1 ]),
					{
						headers: {
							"content-type": "image/png",
						},
					},
				));
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await RendererImageProxyService.fetchRemoteImage({
					imageUrl: "//example.com/cover.png",
				});

				expect(fetchMock).toHaveBeenCalledWith("https://example.com/cover.png");
			},
		);

		it(
			"returns a transparent placeholder when a remote thumbnail fetch fails",
			async () => {
				const fetchMock = vi.fn(async () => {
					throw new TypeError("fetch failed");
				});
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				const response = await RendererImageProxyService.fetchRemoteImage({
					imageUrl: "https://example.com/missing-cover.png",
				});

				expect(response.contentType).toBe("image/png");
				expect(response.bytes.byteLength).toBeGreaterThan(0);
				expect(fetchMock).toHaveBeenCalledTimes(1);

				const cachedResponse = await RendererImageProxyService.fetchRemoteImage({
					imageUrl: "https://example.com/missing-cover.png",
				});
				expect(cachedResponse.contentType).toBe("image/png");
				expect(fetchMock).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"returns app data local image bytes and normalized content type",
			async () => {
				const localPath = join(
					paths.data,
					"image-cache",
					"groups",
					"cover.jpg",
				);
				mkdirSync(
					join(
						paths.data,
						"image-cache",
						"groups",
					),
					{ recursive: true },
				);
				writeFileSync(
					localPath,
					new Uint8Array([
						1,
						2,
						3,
					]),
				);

				const response = await RendererImageProxyService.fetchLocalImage({ localPath });

				expect(response.contentType).toBe("image/jpeg");
				expect(Array.from(new Uint8Array(response.bytes))).toEqual([
					1,
					2,
					3,
				]);
			},
		);

		it(
			"rejects local image paths outside app data",
			async () => {
				await expect(RendererImageProxyService.fetchLocalImage({
					localPath: "/tmp/outside-cover.jpg",
				})).rejects.toThrow("Only app data image files");
			},
		);

		it(
			"rejects non-image responses",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn(async () => new Response(
						"not an image",
						{
							headers: {
								"content-type": "text/html",
							},
						},
					)),
				);

				await expect(RendererImageProxyService.fetchRemoteImage({
					imageUrl: "https://example.com/not-an-image",
				})).rejects.toThrow("rejected non-image response");
			},
		);
	},
);
