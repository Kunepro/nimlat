// Renderer facade scanners keep preload/service access delegation-only and callback-free.

import * as ts from "typescript";
import { toProjectPath } from "./architecture-path-utils";
import {
	createTypeScriptSourceFile,
	getMemberName,
	getNodeLine,
	hasModifier,
	readSingleReturnCall,
} from "./architecture-ts-utils";

function isSpreadArgsOnly(call: ts.CallExpression): boolean {
	if (call.arguments.length !== 1) {
		return false;
	}

	const arg = call.arguments[ 0 ];
	return Boolean(
		arg
		&& ts.isSpreadElement(arg)
		&& ts.isIdentifier(arg.expression)
		&& arg.expression.text === "args",
	);
}

function isWindowElectronApiDelegate(expression: ts.Expression): boolean {
	if (!ts.isPropertyAccessExpression(expression)) {
		return false;
	}

	const apiSection = expression.expression;
	if (!ts.isPropertyAccessExpression(apiSection)) {
		return false;
	}

	const electronApiRoot = apiSection.expression;
	return ts.isPropertyAccessExpression(electronApiRoot)
		&& electronApiRoot.name.text === "electronAPI"
		&& ts.isIdentifier(electronApiRoot.expression)
		&& electronApiRoot.expression.text === "window";
}

function isRendererServiceDelegate(expression: ts.Expression): boolean {
	return ts.isPropertyAccessExpression(expression)
		&& ts.isIdentifier(expression.expression)
		&& expression.expression.text.endsWith("Service");
}

function isRendererFacadeDelegateCall(call: ts.CallExpression): boolean {
	return isSpreadArgsOnly(call)
		&& (
			isWindowElectronApiDelegate(call.expression)
			|| isRendererServiceDelegate(call.expression)
		);
}

export function findRendererFacadeCallableViolations(source: string, file: string): string[] {
	const sourceFile           = createTypeScriptSourceFile(
		file,
		source,
	);
	const violations: string[] = [];

	function addMemberViolation(node: ts.Node, name: string, message: string): void {
		violations.push(`${ toProjectPath(file) }: ${ name } near line ${ getNodeLine(
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

	function readFacadeObjectLiteral(declaration: ts.VariableDeclaration): ts.ObjectLiteralExpression | null {
		const initializer = declaration.initializer
			? unwrapFacadeInitializer(declaration.initializer)
			: null;
		return initializer && ts.isObjectLiteralExpression(initializer)
			? initializer
			: null;
	}

	function checkDelegateBody(
		node: ts.Node,
		name: string,
		body: ts.ConciseBody | ts.Block | undefined,
	): void {
		if (!body) {
			addMemberViolation(
				node,
				name,
				"does not have an inline body",
			);
			return;
		}

		const call = readSingleReturnCall(body);
		if (!call || !isRendererFacadeDelegateCall(call)) {
			addMemberViolation(
				node,
				name,
				"is not a single delegate return using ...args",
			);
		}
	}

	function checkStaticCallable(
		node: ts.MethodDeclaration | ts.PropertyDeclaration,
		name: string,
		body: ts.ConciseBody | ts.Block | undefined,
	): void {
		if (!hasModifier(
			node,
			ts.SyntaxKind.StaticKeyword,
		)) {
			addMemberViolation(
				node,
				name,
				"is not static",
			);
			return;
		}

		checkDelegateBody(
			node,
			name,
			body,
		);
	}

	function checkObjectFacadeProperties(objectLiteral: ts.ObjectLiteralExpression): void {
		objectLiteral.properties.forEach((property) => {
			if (ts.isSpreadAssignment(property)) {
				if (!ts.isIdentifier(property.expression) || !property.expression.text.endsWith("Facade")) {
					addMemberViolation(
						property,
						property.getText(sourceFile),
						"is not a spread from another facade panel",
					);
				}
				return;
			}

			if (ts.isMethodDeclaration(property)) {
				checkDelegateBody(
					property,
					getMemberName(
						sourceFile,
						property.name,
					),
					property.body,
				);
				return;
			}

			if (
				ts.isPropertyAssignment(property)
				&& (ts.isArrowFunction(property.initializer) || ts.isFunctionExpression(property.initializer))
			) {
				checkDelegateBody(
					property,
					getMemberName(
						sourceFile,
						property.name,
					),
					property.initializer.body,
				);
				return;
			}

			addMemberViolation(
				property,
				getMemberName(
					sourceFile,
					property.name,
				),
				"is not an allowed facade delegate property",
			);
		});
	}

	function visit(node: ts.Node): void {
		if (ts.isVariableStatement(node)) {
			const declarations                    = node.declarationList.declarations;
			const isExportedObjectFacadeStatement = hasModifier(
					node,
					ts.SyntaxKind.ExportKeyword,
				)
				&& declarations.every((declaration) =>
					ts.isIdentifier(declaration.name)
					&& declaration.name.text.endsWith("Facade")
					&& Boolean(readFacadeObjectLiteral(declaration)),
				);
			if (isExportedObjectFacadeStatement) {
				declarations.forEach((declaration) => {
					const objectLiteral = readFacadeObjectLiteral(declaration);
					if (objectLiteral) {
						checkObjectFacadeProperties(objectLiteral);
					}
				});
				return;
			}

			declarations.forEach((declaration) => {
				addMemberViolation(
					declaration,
					declaration.name.getText(sourceFile),
					"defines runtime state or helper logic inside a renderer facade",
				);
			});
			return;
		}

		if (ts.isFunctionDeclaration(node)) {
			addMemberViolation(
				node,
				node.name?.text ?? "function",
				"defines helper logic inside a renderer facade",
			);
			return;
		}

		if (ts.isClassDeclaration(node)) {
			node.members.forEach((member) => {
				if (ts.isMethodDeclaration(member)) {
					checkStaticCallable(
						member,
						getMemberName(
							sourceFile,
							member.name,
						),
						member.body,
					);
					return;
				}

				if (
					ts.isPropertyDeclaration(member)
					&& member.initializer
					&& (ts.isArrowFunction(member.initializer) || ts.isFunctionExpression(member.initializer))
				) {
					checkStaticCallable(
						member,
						getMemberName(
							sourceFile,
							member.name,
						),
						member.initializer.body,
					);
					return;
				}

				addMemberViolation(
					member,
					getMemberName(
						sourceFile,
						member.name,
					),
					"is not an allowed facade delegate method",
				);
			});
			return;
		}

		ts.forEachChild(
			node,
			visit,
		);
	}

	visit(sourceFile);
	return violations;
}
