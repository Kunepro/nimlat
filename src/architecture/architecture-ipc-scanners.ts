// IPC handler scanners enforce thin transport adapters without coupling specs to TypeScript AST details.

import * as ts from "typescript";
import {
	createTypeScriptSourceFile,
	getNodeLine,
} from "./architecture-ts-utils";

function isIpcMainRegistration(node: ts.CallExpression): boolean {
	const expression = node.expression;
	return ts.isPropertyAccessExpression(expression)
		&& ts.isIdentifier(expression.expression)
		&& expression.expression.text === "ipcMain"
		&& (
			expression.name.text === "handle"
			|| expression.name.text === "on"
		);
}

function isSingleDelegateExpression(body: ts.ConciseBody): boolean {
	return ts.isCallExpression(body)
		|| (
			ts.isAwaitExpression(body)
			&& ts.isCallExpression(body.expression)
		);
}

export function findIpcHandlerThinnessViolations(source: string, file: string): string[] {
	const sourceFile           = createTypeScriptSourceFile(
		file,
		source,
	);
	const violations: string[] = [];

	function visit(node: ts.Node): void {
		if (ts.isCallExpression(node) && isIpcMainRegistration(node)) {
			const callback = node.arguments[ 1 ];
			if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
				violations.push(`registration near line ${ getNodeLine(
					sourceFile,
					node,
				) } does not use an inline delegate callback`);
			} else if (ts.isBlock(callback.body)) {
				violations.push(`callback near line ${ getNodeLine(
					sourceFile,
					callback,
				) } uses a block body instead of delegating with a single expression`);
			} else if (!isSingleDelegateExpression(callback.body)) {
				violations.push(`callback near line ${ getNodeLine(
					sourceFile,
					callback,
				) } is not a single delegate call`);
			}
		}

		ts.forEachChild(
			node,
			visit,
		);
	}

	visit(sourceFile);
	return violations;
}
