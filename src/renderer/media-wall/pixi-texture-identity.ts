import type { Texture } from "pixi.js";

const textureIdentityMap = new WeakMap<Texture, number>();
let nextTextureIdentity  = 1;

export function getTextureIdentity(texture: Texture | null): number | null {
	if (!texture || texture.destroyed) {
		return null;
	}
	const currentIdentity = textureIdentityMap.get(texture);
	if (currentIdentity) {
		return currentIdentity;
	}
	const nextIdentity = nextTextureIdentity;
	nextTextureIdentity += 1;
	textureIdentityMap.set(
		texture,
		nextIdentity,
	);
	return nextIdentity;
}
