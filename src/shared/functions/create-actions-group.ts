export const props = <T>() => (args: T) => args;

type ActionPayload = Record<string, unknown>;
type ActionCreator = (...args: never[]) => ActionPayload;
type CreatedActionGroup<Source extends string, Events extends Record<string, ActionCreator>> = {
	[K in keyof Events as CamelCased<K & string>]: (
		...args: Parameters<Events[K]>
	) => { type: `${ Source } ${ K & string }` } & ReturnType<Events[K]>;
};

export function createActionGroup<
	Source extends string,
	const Events extends Record<string, ActionCreator>
>(config: {
	source: Source;
	events: Events;
}): CreatedActionGroup<Source, Events> {
	const result = {} as CreatedActionGroup<Source, Events>;

	Object.entries(config.events).forEach(([ key, eventCreator ]) => {
		const methodName = toCamelCaseFunctionName(key);
		result[ methodName as keyof CreatedActionGroup<Source, Events> ] = ((...args: Parameters<typeof eventCreator>) => ({
			type: `${ config.source } ${ key }`,
			...eventCreator(...args),
		})) as CreatedActionGroup<Source, Events>[keyof CreatedActionGroup<Source, Events>];
	});
	return result;
}

type CamelCased<S extends string> =
	S extends `${ infer First } ${ infer Rest }`
		? `${ Lowercase<First> }${ Capitalize<CamelCased<Rest>> }`
		: Lowercase<S>;

// "this World of us" => "thisWorldOfUs"
function toCamelCaseFunctionName(str: string): string {
	return str.trim()
		.split(/\s+/)
		.map((w, i) =>
			i === 0
				? w.toLowerCase()
				: w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
		).join("");
}
