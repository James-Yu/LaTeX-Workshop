import * as vscode from 'vscode'
import * as fs from 'fs'
import { lw } from '../../lw'
import { convertFilenameEncoding } from '../../utils/convertfilename'

export interface IParser {
    showLog(): void,
    parse(log: string, rootFile?: string): LogEntry[]
}

export type LogEntry = { type: string, file: string, text: string, line: number, errorPosText?: string }

function getErrorPosition(item: LogEntry): {start: number, end: number} | undefined {
    if (!item.errorPosText) {
        return
    }
    const content = lw.cache.get(item.file)?.content
    if (!content) {
        return
    }
    // Try to find the errorPosText in the respective line of the document
    const lines = content.split('\n')
    if (lines.length >= item.line) {
        const line = lines[item.line-1]
        let pos = line.indexOf(item.errorPosText)
        if (pos >= 0) {
            pos += item.errorPosText.length
            // Find the length of the last word in the error.
            // This is the length of the error-range
            const len = item.errorPosText.length - item.errorPosText.lastIndexOf(' ') - 1
            if (len > 0) {
                return {start: pos - len, end: pos}
            }
        }
    }
    return
}

const DIAGNOSTIC_SEVERITY: { [key: string]: vscode.DiagnosticSeverity } = {
    'typesetting': vscode.DiagnosticSeverity.Information,
    'warning': vscode.DiagnosticSeverity.Warning,
    'error': vscode.DiagnosticSeverity.Error,
}

export function showCompilerDiagnostics(diagnostics: vscode.DiagnosticCollection, buildLog: LogEntry[]) {
    diagnostics.clear()
    const diagsCollection = Object.create(null) as { [key: string]: vscode.Diagnostic[] }
    for (const item of buildLog) {
        let startChar = 0
        let endChar = 65535
        // Try to compute a more precise position
        const preciseErrorPos = getErrorPosition(item)
        if (preciseErrorPos) {
            startChar = preciseErrorPos.start
            endChar = preciseErrorPos.end
        }

        const range = new vscode.Range(new vscode.Position(item.line - 1, startChar), new vscode.Position(item.line - 1, endChar))
        const diag = new vscode.Diagnostic(range, item.text.trimEnd(), DIAGNOSTIC_SEVERITY[item.type])
        diag.source = diagnostics.name
        if (diagsCollection[item.file] === undefined) {
            diagsCollection[item.file] = []
        }
        diagsCollection[item.file].push(diag)
    }

    const configuration = vscode.workspace.getConfiguration('latex-workshop')
    const convEnc = configuration.get('message.convertFilenameEncoding') as boolean
    for (const file in diagsCollection) {
        let file1 = file
        if (!fs.existsSync(file1) && convEnc) {
            const f = convertFilenameEncoding(file1)
            if (f !== undefined) {
                file1 = f
            }
        }
        diagnostics.set(vscode.Uri.file(file1), diagsCollection[file])
    }
}
