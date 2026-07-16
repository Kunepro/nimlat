// Database facade scanners enforce logged, delegation-only DB operation panels.

import * as ts from "typescript";
import { toProjectPath } from "./architecture-path-utils";
import {
	createTypeScriptSourceFile,
	getNodeLine,
	hasModifier,
} from "./architecture-ts-utils";

const dbFacadeOperationWrappers = new Set([
	"runAnimeDbFacadeOperation",
	"runDatabaseFacadeOperation",
	"runUserDbFacadeOperation",
]);

export function findDatabaseFacadeCallableViolations(source: string, file: string): string[] {
	const sourceFile           = createTypeScriptSourceFile(
		file,
		source,
	);
	const violations: string[] = [];

	function readDelegateWrapperCall(body: ts.ConciseBody): ts.CallExpression | null {
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
		if (statement && ts.isReturnStatement(statement)) {
			return statement.expression && ts.isCallExpression(statement.expression)
				? statement.expression
				: null;
		}
		if (statement && ts.isExpressionStatement(statement)) {
			return ts.isCallExpression(statement.expression)
				? statement.expression
				: null;
		}

		return null;
	}

	function isFacadeWrapperCall(call: ts.CallExpression): boolean {
		return ts.isIdentifier(call.expression) && dbFacadeOperationWrappers.has(call.expression.text);
	}

	function readOperationCall(body: ts.ConciseBody): ts.CallExpression | null {
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

	function checkOperationThunk(wrapperCall: ts.CallExpression): string | null {
		const operationThunk = wrapperCall.arguments[ 1 ];
		if (!operationThunk) {
			return "does not pass an operation thunk to the logged DB wrapper";
		}
		if (!ts.isArrowFunction(operationThunk) && !ts.isFunctionExpression(operationThunk)) {
			return "passes a non-inline operation thunk to the logged DB wrapper";
		}

		const operationCall = readOperationCall(operationThunk.body);
		if (!operationCall || !ts.isIdentifier(operationCall.expression)) {
			return "operation thunk is not a direct call to one DB operation function";
		}

		return null;
	}

	function addCallable(name: ts.PropertyName | ts.PrivateIdentifier | undefined, body: ts.ConciseBody, node: ts.Node): void {
		const callableName = name?.getText(sourceFile) ?? "anonymous";
		const callableLine = getNodeLine(
			sourceFile,
			node,
		);
		const wrapperCall  = readDelegateWrapperCall(body);
		if (!wrapperCall || !isFacadeWrapperCall(wrapperCall)) {
			violations.push(`${ toProjectPath(file) }: ${ callableName } near line ${ callableLine } is not a single logged DB facade wrapper call`);
			return;
		}

		const operationThunkViolation = checkOperationThunk(wrapperCall);
		if (operationThunkViolation) {
			violations.push(`${ toProjectPath(file) }: ${ callableName } near line ${ callableLine } ${ operationThunkViolation }`);
		}
	}

	function visit(node: ts.Node): void {
		if (ts.isMethodDeclaration(node) && node.body) {
			addCallable(
				node.name,
				node.body,
				node,
			);
		}

		if (
			ts.isPropertyAssignment(node)
			&& (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
		) {
			addCallable(
				node.name,
				node.initializer.body,
				node,
			);
		}

		ts.forEachChild(
			node,
			visit,
		);
	}

	visit(sourceFile);
	return violations;
}

export function findDefaultParameterViolations(source: string, file: string): string[] {
	const sourceFile           = createTypeScriptSourceFile(
		file,
		source,
	);
	const violations: string[] = [];

	function visit(node: ts.Node): void {
		if (ts.isParameter(node) && node.initializer) {
			violations.push(`${ toProjectPath(file) }: parameter ${ node.name.getText(sourceFile) } near line ${ getNodeLine(
				sourceFile,
				node,
			) } defines a default value inside a facade`);
		}

		ts.forEachChild(
			node,
			visit,
		);
	}

	visit(sourceFile);
	return violations;
}

export function findRuntimeConditionalExpressionViolations(source: string, file: string): string[] {
	const sourceFile           = createTypeScriptSourceFile(
		file,
		source,
	);
	const violations: string[] = [];

	function visit(node: ts.Node): void {
		if (ts.isConditionalExpression(node)) {
			violations.push(`${ toProjectPath(file) }: ternary near line ${ getNodeLine(
				sourceFile,
				node,
			) } moves decision logic into a facade`);
		}

		ts.forEachChild(
			node,
			visit,
		);
	}

	visit(sourceFile);
	return violations;
}

export function findDatabaseFacadeRuntimeHelperViolations(source: string, file: string): string[] {
	const sourceFile           = createTypeScriptSourceFile(
		file,
		source,
	);
	const violations: string[] = [];

	function addViolation(node: ts.Node, message: string): void {
		violations.push(`${ toProjectPath(file) }: line ${ getNodeLine(
			sourceFile,
			node,
		) } ${ message }`);
	}

	function unwrapFacadeInitializer(initializer: ts.Expression): ts.Expression {
		if (
			ts.isAsExpression(initializer)
			|| ts.isTypeAssertionExpression(initializer)
			|| ts.isParenthesizedExpression(initializer)
			|| ts.isSatisfiesExpression(initializer)
		) {
			return unwrapFacadeInitializer(initializer.expression);
		}

		return initializer;
	}

	sourceFile.statements.forEach((statement) => {
		if (
			ts.isImportDeclaration(statement)
			|| ts.isImportEqualsDeclaration(statement)
			|| ts.isTypeAliasDeclaration(statement)
			|| ts.isInterfaceDeclaration(statement)
		) {
			return;
		}

		if (ts.isClassDeclaration(statement)) {
			const isExportedFacadeClass = hasModifier(
					statement,
					ts.SyntaxKind.ExportKeyword,
				)
				&& statement.name?.text.endsWith("Facade");
			if (!isExportedFacadeClass) {
				addViolation(
					statement,
					"defines runtime helper logic inside a database facade",
				);
			}
			return;
		}

		if (ts.isVariableStatement(statement)) {
			const declarations   = statement.declarationList.declarations;
			const isExported     = hasModifier(
				statement,
				ts.SyntaxKind.ExportKeyword,
			);
			const isFacadeExport = isExported && declarations.every((declaration) => {
				const initializer = declaration.initializer
					? unwrapFacadeInitializer(declaration.initializer)
					: null;

				return ts.isIdentifier(declaration.name)
					&& declaration.name.text.endsWith("Facade")
					&& Boolean(initializer && ts.isObjectLiteralExpression(initializer));
			});
			if (!isFacadeExport) {
				addViolation(
					statement,
					"defines runtime helper state inside a database facade",
				);
			}
			return;
		}

		if (ts.isExportDeclaration(statement)) {
			return;
		}

		addViolation(
			statement,
			"defines runtime helper logic inside a database facade",
		);
	});

	return violations;
}
