/* eslint-disable no-redeclare */
import type { MonoTypeOperatorFunction } from "rxjs";
import { filter } from "rxjs";

type Action = { type: string };

// Narrow by string type
export function ofType<T extends Action, K extends T["type"]>(
	...types: K[]
): MonoTypeOperatorFunction<Extract<T, { type: K }>>;

// Narrow by action creators (e.g. ActionsUser.get)
export function ofType<T extends Action>(
	...creators: Array<(...args: never[]) => T>
): MonoTypeOperatorFunction<T>;

export function ofType<T extends Action>(...args: Array<string | ((...args: never[]) => T)>): MonoTypeOperatorFunction<T> {
	const types: string[] = args.map(arg =>
		typeof arg === "function" ? arg().type : arg,
	);
	return filter((action: Action): action is T => types.includes(action.type));
}
