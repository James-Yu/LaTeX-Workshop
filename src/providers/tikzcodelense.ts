import * as vscode from 'vscode'
import { stripComments } from '../utils'

export class TikzCodeLense implements vscode.CodeLensProvider {
    onDidChangeCodeLenses?: vscode.Event<void> | undefined

    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        if (!vscode.workspace.getConfiguration('latex-workshop.tikzpreview').get('enabled') as boolean) {
            return []
        }

        const matches = findTikzPictures(document)
        return matches.map(
            match =>
                new vscode.CodeLens(match.range, {
                    title: 'View TikZ Picture',
                    tooltip: 'Open view of this TikZ Picture',
                    command: 'latex-workshop.viewtikzpicture',
                    arguments: [match.document, match.range]
                })
        )
    }
}

interface TikzPictureMatch {
    document: vscode.TextDocument
    range: vscode.Range
}

function findTikzPictures(document: vscode.TextDocument) {
    const matches: TikzPictureMatch[] = []
    const startRegex = /\\begin{tikzpicture}/
    const endRegex = /\\end{tikzpicture}/
    for (let i = 0; i < document.lineCount; i++) {
        let line = document.lineAt(i)
        let text = stripComments(line.text, '%')
        const startMatch: RegExpMatchArray | null = text.match(startRegex)
        if (!startMatch) {
            continue
        }
        const startColumn = startMatch.index
        if (startColumn === null || startColumn === undefined) {
            continue
        }

        let lineNo = i
        let endMatch: RegExpMatchArray | null = null
        let endColumn: number | undefined
        do {
            if (lineNo - 1 === document.lineCount) {
                continue
            }
            line = document.lineAt(++lineNo)
            text = line.text.substr(0, 1000)
            endMatch = text.match(endRegex)
            if (endMatch && endMatch.index !== undefined) {
                endColumn = endMatch.index + endMatch[0].length
            }
        } while (!endMatch)

        if (endColumn === null || endColumn === undefined) {
            continue
        }

        matches.push({
            document,
            range: new vscode.Range(i, startColumn, lineNo, endColumn)
        })

        i = lineNo
    }

    return matches
}
