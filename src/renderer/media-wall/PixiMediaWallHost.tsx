import {
	useId,
	useMemo,
} from "react";
import type { PixiMediaWallHostProps } from "../types/media-wall";
import { PixiMediaWallView } from "./PixiMediaWallView";
import { usePixiMediaWallController } from "./use-pixi-media-wall-controller";

export function PixiMediaWallHost<TItem>(props: PixiMediaWallHostProps<TItem>) {
	const reactHostId = useId();
	const hostStateKey = useMemo(
		() => `${ props.dataKey }\u0000${ reactHostId }`,
		[
			props.dataKey,
			reactHostId,
		],
	);
	const viewModel = usePixiMediaWallController({
		...props,
		hostStateKey,
	});

	return <PixiMediaWallView { ...viewModel } />;
}
