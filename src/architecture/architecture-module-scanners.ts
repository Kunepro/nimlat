// Generic text/module scanners shared by architecture boundary specs.

import * as ts from "typescript";
import {
	readSource,
	toProjectPath,
} from "./architecture-path-utils";
import {
	createTypeScriptSourceFile,
	getNodeLine,
} from "./architecture-ts-utils";

export function readStaticModuleSpecifiers(source: string, file: string): Array<{
	line: number;
	moduleSpecifier: string;
}> {
	const sourceFile = createTypeScriptSourceFile(
		file,
		source,
	);
	const moduleSpecifiers: Array<{
		line: number;
		moduleSpecifier: string;
	}>               = [];

	function addModuleSpecifier(moduleSpecifier: ts.Expression | undefined, node: ts.Node): void {
		if (!moduleSpecifier || !ts.isStringLiteralLike(moduleSpecifier)) {
			return;
		}

		moduleSpecifiers.push({
			line:            getNodeLine(
				sourceFile,
				node,
			),
			moduleSpecifier: moduleSpecifier.text,
		});
	}

	function visit(node: ts.Node): void {
		if (ts.isImportDeclaration(node)) {
			addModuleSpecifier(
				node.moduleSpecifier,
				node,
			);
		}

		if (ts.isExportDeclaration(node)) {
			addModuleSpecifier(
				node.moduleSpecifier,
				node,
			);
		}

		ts.forEachChild(
			node,
			visit,
		);
	}

	visit(sourceFile);
	return moduleSpecifiers;
}

export function findViteAliasTargets(source: string): Array<{
	alias: string;
	line: number;
	target: string;
}> {
	const aliases: Array<{
		alias: string;
		line: number;
		target: string;
	}>                 = [];
	const aliasPattern = /(['"])(@nimlat\/[^'"]+)\1:\s*path\.resolve\(\s*__dirname,\s*(['"])([^'"]+)\3\s*\)/g;
	let match: RegExpExecArray | null;

	while ((match = aliasPattern.exec(source)) !== null) {
		aliases.push({
			alias:  match[ 2 ] ?? "unknown",
			line:   source.slice(
				0,
				match.index,
			).split("\n").length,
			target: match[ 4 ] ?? "",
		});
	}

	return aliases;
}

export function stripCommentsAndStrings(source: string): string {
	return source
		.replace(
			/\/\*[\s\S]*?\*\//g,
			"",
		)
		.replace(
			/\/\/.*$/gm,
			"",
		)
		.replace(
			/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g,
			"\"\"",
		);
}

export function findCatchBlocksWithoutThrow(source: string): number[] {
	const violations: number[] = [];
	const catchPattern         = /\bcatch\s*\([^)]*\)\s*\{/g;
	let match: RegExpExecArray | null;

	while ((match = catchPattern.exec(source)) !== null) {
		const openBraceIndex = source.indexOf(
			"{",
			match.index,
		);
		let depth            = 0;
		let closeBraceIndex  = openBraceIndex;
		for (let index = openBraceIndex; index < source.length; index++) {
			if (source[ index ] === "{") {
				depth++;
			}
			if (source[ index ] === "}") {
				depth--;
			}
			if (depth === 0) {
				closeBraceIndex = index;
				break;
			}
		}

		const catchBlock = source.slice(
			openBraceIndex,
			closeBraceIndex + 1,
		);
		if (!/\bthrow\b/.test(catchBlock)) {
			violations.push(source.slice(
				0,
				match.index,
			).split("\n").length);
		}
	}

	return violations;
}

export function findViolations(files: string[], predicate: (source: string, file: string) => string | null): string[] {
	return files.flatMap((file) => {
		const violation = predicate(
			readSource(file),
			file,
		);
		return violation ? [ `${ toProjectPath(file) }: ${ violation }` ] : [];
	});
}

export function findElectronBoundaryViolation(source: string): string | null {
	const executableSource = stripCommentsAndStrings(source);

	if (/from\s+["']electron["']|require\(\s*["']electron["']\s*\)/.test(source)) {
		return "imports Electron directly";
	}
	if (/\b(?:ipcMain|ipcRenderer|contextBridge)\b/.test(executableSource)) {
		return "touches Electron IPC/context bridge primitives directly";
	}
	if (/\b(?:webContents|mainFrame)\s*\.\s*send\b/.test(executableSource)) {
		return "sends directly to renderer outside the IPC boundary";
	}
	if (/\bbroadcastToRendererWindows\b/.test(executableSource)) {
		return "broadcasts to renderer outside the IPC bridge layer";
	}

	return null;
}
