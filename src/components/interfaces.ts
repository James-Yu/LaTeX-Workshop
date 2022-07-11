import type fs from 'fs'
import type {latexParser, bibtexParser} from 'latex-utensils'
import type vscode from 'vscode'
import type {Content} from './manager'

export interface ILogger {
    addLogMessage(message: string): void,
    logCommand(message: string, command: string, args: string[]): void,
    addCompilerMessage(message: string): void,
    logError(e: Error): void,
    logOnRejected(e: unknown): void,
    clearCompilerMessage(): void,
    displayStatus(
        icon: string,
        color: string,
        message: string | undefined,
        severity: 'info' | 'warning' | 'error',
        build: string
    ): void,
    showErrorMessage(message: string, ...args: string[]): Thenable<string | undefined> | undefined,
    showErrorMessageWithCompilerLogButton(message: string): void,
    showErrorMessageWithExtensionLogButton(message: string): void,
    showLog(): void,
    showCompilerLog(): void
}

export interface ILwFileSystem {
    isLocalUri(uri: vscode.Uri): boolean,
    isVirtualUri(uri: vscode.Uri): boolean,
    exists(uri: vscode.Uri): Promise<boolean>,
    readFile(fileUri: vscode.Uri): Promise<string>,
    readFileAsBuffer(fileUri: vscode.Uri): Promise<Buffer>,
    readFileSyncGracefully(filepath: string): string | undefined,
    stat(fileUri: vscode.Uri): Promise<fs.Stats | vscode.FileStat>
}

export interface IManager {
    readonly rootDir: string | undefined,
    rootFile: string | undefined,
    rootFileUri: vscode.Uri | undefined,
    getOutDir(texPath?: string): string,
    getCachedContent(filePath: string): Content[string] | undefined,
    hasTexId(id: string): boolean,
    findRoot(): Promise<string | undefined>,
    getIncludedBib(file?: string, includedBib?: string[], children?: string[]): string[],
    getIncludedTeX(file?: string, includedTeX?: string[]): string[],
    getDirtyContent(file: string): string | undefined
}

export interface IUtensilsParser {
    dispose(): void,
    parseLatex(s: string, options?: latexParser.ParserOptions): Promise<latexParser.LatexAst | undefined>,
    parseLatexPreamble(s: string): Promise<latexParser.AstPreamble>,
    parseBibtex(s: string, options?: bibtexParser.ParserOptions): Promise<bibtexParser.BibtexAst>
}
