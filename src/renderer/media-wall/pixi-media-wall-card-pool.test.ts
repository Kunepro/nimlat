// @vitest-environment node
import type { Container } from "pixi.js";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { MediaWallItem } from "../types/media-wall";
import {
	PixiMediaWallCardPool,
	type PixiMediaWallPooledCard,
} from "./pixi-media-wall-card-pool";

interface FakePooledCard extends PixiMediaWallPooledCard {
	readonly id: number;
}

function createLayer(addChild: ReturnType<typeof vi.fn>): Pick<Container, "addChild"> {
	return {
		addChild: addChild as unknown as Pick<Container, "addChild">["addChild"],
	};
}

function createMediaWallItem(id: string): MediaWallItem {
	return {
		id,
		kind:  "library",
		title: id,
	};
}

describe(
	"PixiMediaWallCardPool",
	() => {
		it(
			"grows reusable cards and attaches each released card to the Pixi layer",
			() => {
				const events: string[] = [];
				const addChild         = vi.fn((container: Container) => {
					events.push(`add:${ String((container as unknown as { id: number }).id) }`);
					return container;
				});
				const createCard       = vi.fn((mapItem: (item: string) => MediaWallItem): FakePooledCard => {
					const id        = createCard.mock.calls.length;
					const container = { id } as unknown as Container;
					expect(mapItem(`media:${ id }`)).toEqual(createMediaWallItem(`media:${ id }`));
					return {
						container,
						destroy: vi.fn(() => {
							events.push(`destroy:${ id }`);
						}),
						id,
						release: vi.fn(() => {
							events.push(`release:${ id }`);
						}),
					};
				});
				const pool             = new PixiMediaWallCardPool<string, FakePooledCard>({
					createCard,
					mapItem: createMediaWallItem,
				});

				pool.ensureVisibleCount(
					createLayer(addChild),
					2,
				);
				pool.ensureVisibleCount(
					createLayer(addChild),
					1,
				);

				expect(pool.size).toBe(2);
				expect(pool.cards.map(card => card.id)).toEqual([
					1,
					2,
				]);
				expect(createCard).toHaveBeenCalledTimes(2);
				expect(addChild).toHaveBeenCalledTimes(2);
				expect(events).toEqual([
					"release:1",
					"add:1",
					"release:2",
					"add:2",
				]);
			},
		);

		it(
			"does not create cards until a layer is available",
			() => {
				const createCard = vi.fn(() => ({
					container: {} as Container,
					destroy:   vi.fn(),
					release:   vi.fn(),
				}));
				const pool       = new PixiMediaWallCardPool<string>({
					createCard,
					mapItem: createMediaWallItem,
				});

				pool.ensureVisibleCount(
					null,
					4,
				);

				expect(pool.size).toBe(0);
				expect(createCard).not.toHaveBeenCalled();
			},
		);

		it(
			"destroys all pooled cards and clears the pool even when one card teardown throws",
			() => {
				const firstDestroy  = vi.fn(() => {
					throw new Error("lost graphics context");
				});
				const secondDestroy = vi.fn();
				const createCard    = vi.fn()
					.mockReturnValueOnce({
						container: {} as Container,
						destroy:   firstDestroy,
						release:   vi.fn(),
					})
					.mockReturnValueOnce({
						container: {} as Container,
						destroy:   secondDestroy,
						release:   vi.fn(),
					});
				const pool          = new PixiMediaWallCardPool<string>({
					createCard,
					mapItem: createMediaWallItem,
				});

				pool.ensureVisibleCount(
					createLayer(vi.fn()),
					2,
				);

				expect(() => pool.destroy()).not.toThrow();
				expect(pool.size).toBe(0);
				expect(firstDestroy).toHaveBeenCalledOnce();
				expect(secondDestroy).toHaveBeenCalledOnce();
			},
		);
	},
);
