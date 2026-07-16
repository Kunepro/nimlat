import type { Container } from "pixi.js";
import type { MediaWallItem } from "../types/media-wall";

export interface PixiMediaWallPooledCard {
	container: Container;
	destroy: () => void;
	release: () => void;
}

type PixiMediaWallCardFactory<TItem, TCard extends PixiMediaWallPooledCard> = (mapItem: (item: TItem) => MediaWallItem) => TCard;

interface PixiMediaWallCardPoolOptions<TItem, TCard extends PixiMediaWallPooledCard> {
	createCard: PixiMediaWallCardFactory<TItem, TCard>;
	mapItem: (item: TItem) => MediaWallItem;
}

// Owns pooled card creation and teardown. The wall renderer decides how many
// cards a frame needs; this pool owns how reusable card instances are grown,
// released before first paint, attached to Pixi, and safely destroyed.
export class PixiMediaWallCardPool<TItem, TCard extends PixiMediaWallPooledCard = PixiMediaWallPooledCard> {
	private readonly createCard: PixiMediaWallCardFactory<TItem, TCard>;
	private readonly mapItem: (item: TItem) => MediaWallItem;
	private readonly pool: TCard[] = [];

	public constructor({
											 createCard,
											 mapItem,
										 }: PixiMediaWallCardPoolOptions<TItem, TCard>) {
		this.createCard = createCard;
		this.mapItem    = mapItem;
	}

	public get cards(): ReadonlyArray<TCard> {
		return this.pool;
	}

	public get size(): number {
		return this.pool.length;
	}

	public ensureVisibleCount(layer: Pick<Container, "addChild"> | null, visibleCount: number): void {
		if (!layer) {
			return;
		}
		while (this.pool.length < visibleCount) {
			const card = this.createCard(this.mapItem);
			card.release();
			this.pool.push(card);
			layer.addChild(card.container);
		}
	}

	public destroy(): void {
		this.pool.splice(0).forEach((card) => {
			try {
				card.destroy();
			} catch {
				// Card resources can already be invalid after a failed or lost graphics context.
			}
		});
	}
}
