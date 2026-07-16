// Small TypeScript AST helpers used by static architecture scanners.

import * as ts from "typescript";

export function createTypeScriptSourceFile(path: string, source: string): ts.SourceFile {
	return ts.createSourceFile(
		path,
		source,
		ts.ScriptTarget.Latest,
		true,
		path.endsWith(".tsx")
			? ts.ScriptKind.TSX
			: ts.ScriptKind.TS,
	);
}

export function getNodeLine(sourceFile: ts.SourceFile, node: ts.Node): number {
	return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

export function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
	return ts.canHaveModifiers(node) && Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === kind));
}

export function getMemberName(sourceFile: ts.SourceFile, name: ts.PropertyName | ts.PrivateIdentifier | undefined): string {
	return name?.getText(sourceFile) ?? "anonymous";
}

export function readSingleReturnCall(body: ts.ConciseBody | ts.Block): ts.CallExpression | null {
	if (!ts.isBlock(body)) {
		return ts.isCallExpression(body)
			? body
			: null;
	}

	const statements = body.statements.filter((statement) => !ts.isEmptyStatement(statement));
	if (statements.length !== 1) {
		return null;
	}

	const statement = statements[ 0 ];
	if (!statement || !ts.isReturnStatement(statement)) {
		return null;
	}

	return statement.expression && ts.isCallExpression(statement.expression)
		? statement.expression
		: null;
}
