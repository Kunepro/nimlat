// @vitest-environment node
import { Texture } from "pixi.js";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	createPixiCardParts,
	releasePixiCardParts,
} from "./pixi-card-parts";

const pixiMock = vi.hoisted(() => {
	class DisplayObjectMock {
		public alpha                                   = 1;
		public blendMode: string | null                = null;
		public filters: unknown[]                      = [];
		public height                                  = 0;
		public mask: unknown                           = null;
		public text                                    = "";
		public texture: unknown                        = null;
		public visible                                 = true;
		public width                                   = 0;
		public readonly position                       = {
			set: vi.fn(),
		};
		public readonly pivot = {
			set: vi.fn(),
		};
		public readonly scale = {
			set: vi.fn(),
		};
		public readonly style: Record<string, unknown> = {};

		public destroy(): void {
			this.visible = false;
		}
	}

	class ContainerMock extends DisplayObjectMock {
		public readonly children: unknown[] = [];

		public addChild(...children: unknown[]): unknown {
			const firstChildIndex = this.children.length;
			this.children.splice(
				firstChildIndex,
				0,
				...children,
			);
			return this.children[ firstChildIndex ];
		}
	}

	class GraphicsMock extends ContainerMock {}

	class SpriteMock extends ContainerMock {
		public constructor(options: { texture: unknown }) {
			super();
			this.texture = options.texture;
		}
	}

	class TextMock extends ContainerMock {
		public constructor(options: { style: Record<string, unknown>; text: string }) {
			super();
			this.text = options.text;
			Object.assign(
				this.style,
				options.style,
			);
		}
	}

	class TextStyleMock {
		public constructor(style: Record<string, unknown>) {
			Object.assign(
				this,
				style,
			);
		}
	}

	class BlurFilterMock {
		public padding = 0;

		public constructor(public readonly options: Record<string, unknown>) {}
	}

	const TextureMock = {
		EMPTY: {
			destroyed: false,
			id:        "empty",
		},
		WHITE: {
			destroyed: false,
			id:        "white",
		},
	};

	return {
		BlurFilter: BlurFilterMock,
		Container:  ContainerMock,
		Graphics:   GraphicsMock,
		Sprite:     SpriteMock,
		Text:       TextMock,
		TextStyle:  TextStyleMock,
		Texture:    TextureMock,
	};
});

vi.mock(
	"pixi.js",
	() => pixiMock,
);

describe(
	"pixi card parts",
	() => {
		it(
			"creates one ordered display tree for a pooled card",
			() => {
				const parts            = createPixiCardParts();
				const expectedChildren = [
					parts.background,
					parts.borderShine,
					parts.poster,
					parts.thumbnailSprite,
					parts.posterMask,
					parts.watchedPosterOverlay,
					parts.terminalPanel,
					...parts.terminalTexts,
					parts.actionButton,
					parts.countBadgeBackground,
					parts.countBadgeText,
					parts.adultBadgeBackground,
					parts.adultBadgeText,
					parts.progressTrack,
					parts.progressValue,
					parts.titleText,
					parts.subtitleText,
					parts.projectorBeam,
					parts.projectorHardware,
					parts.borderGlow,
					parts.borderMetalPlates,
					parts.topPlaqueLabel,
					parts.sidePlaqueLabel,
				];

				expect(parts.container.children).toEqual(expectedChildren);
				expect(parts.thumbnailSprite.mask).toBe(parts.posterMask);
				expect(parts.borderGlow.blendMode).toBe("add");
				expect(parts.projectorBeam.blendMode).toBe("add");
				expect(parts.container.children[ 0 ]).toBe(parts.background);
				expect(parts.container.children.at(-1)).toBe(parts.sidePlaqueLabel);

				parts.container.destroy({
					children: true,
				});
			},
		);

		it(
			"resets transient surfaces when a card is released back to the pool",
			() => {
				const parts        = createPixiCardParts();
				const visibleParts = [
					parts.actionButton,
					parts.adultBadgeBackground,
					parts.adultBadgeText,
					parts.countBadgeBackground,
					parts.countBadgeText,
					parts.projectorBeam,
					parts.projectorHardware,
					parts.sidePlaqueLabel,
					parts.terminalPanel,
					parts.topPlaqueLabel,
					parts.watchedPosterOverlay,
					...parts.terminalTexts,
				];
				visibleParts.forEach((part) => {
					part.visible = true;
				});
				parts.container.visible       = true;
				parts.container.alpha         = 0.4;
				parts.thumbnailSprite.texture = Texture.WHITE;
				parts.thumbnailSprite.visible = true;

				releasePixiCardParts(parts);

				expect(parts.container.visible).toBe(false);
				expect(parts.container.alpha).toBe(1);
				expect(parts.thumbnailSprite.texture).toBe(Texture.EMPTY);
				expect(parts.thumbnailSprite.visible).toBe(false);
				expect(visibleParts.every(part => !part.visible)).toBe(true);

				parts.container.destroy({
					children: true,
				});
			},
		);
	},
);
