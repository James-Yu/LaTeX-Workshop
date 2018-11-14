import * as vscode from 'vscode'

import {Extension} from '../main'

export class FoldingProvider implements vscode.FoldingRangeProvider {
    extension: Extension
    sectionRegex: RegExp[] = []

    constructor(extension: Extension) {
        this.extension = extension
        const sections = vscode.workspace.getConfiguration('latex-workshop').get('view.outline.sections') as string[]
        this.sectionRegex = sections.map(section => RegExp(`\\\\${section}(?:\\*)?(?:\\[[^\\[\\]\\{\\}]*\\])?{(.*)}`, 'm'))
    }

    public provideFoldingRanges(
        document: vscode.TextDocument,
        _context: vscode.FoldingContext,
        _token: vscode.CancellationToken
    ) : vscode.ProviderResult<vscode.FoldingRange[]> {
        return [...this.getSectionFoldingRanges(document), ...this.getEnvironmentFoldingRanges(document)]
    }

    private getSectionFoldingRanges(document: vscode.TextDocument) {
        const startingIndices: number[] = this.sectionRegex.map(_ => -1)
        const lines = document.getText().split(/\r?\n/g)

        const sections: {level: number, from: number, to: number}[] = []
        for (const line of lines) {
            const index = lines.indexOf(line)
            for (const regex of this.sectionRegex) {
                const result = regex.exec(line)
                if (!result) {
                    continue
                }
                const regIndex = this.sectionRegex.indexOf(regex)
                const originalIndex = startingIndices[regIndex]
                if (originalIndex === -1) {
                    startingIndices[regIndex] = index
                    continue
                }
                let i = regIndex
                while (i < this.sectionRegex.length) {
                    sections.push({
                        level: i,
                        from: startingIndices[i],
                        to: index - 1
                    })
                    startingIndices[i] = regIndex === i ? index : -1
                    ++i
                }
            }
            if (/\\end{document}/.exec(line) || index === lines.length - 1) {
                for (let i = 0; i < startingIndices.length; ++i) {
                    if (startingIndices[i] === -1) {
                        continue
                    }
                    sections.push({
                        level: i,
                        from: startingIndices[i],
                        to: index - 1
                    })
                }
            }
        }

        return sections.map(section => {
            return new vscode.FoldingRange(section.from, section.to)
        })
    }

    private getEnvironmentFoldingRanges(document: vscode.TextDocument) {
        const ranges: vscode.FoldingRange[] = []
        let textToMatch = [{ text: document.getText(), offset: 0 }]
        while (textToMatch.length > 0) {
            const newTextToMatch: { text: string, offset: number }[] = []
            textToMatch.forEach(textObj => {
                const envRegex = /(\\begin{(.*?)})([\w\W]*)\\end{\2}/g
                let match = envRegex.exec(textObj.text)
                while (match) {
                    ranges.push(
                        new vscode.FoldingRange(
                            document.positionAt(textObj.offset + envRegex.lastIndex - match[0].length).line,
                            document.positionAt(textObj.offset + envRegex.lastIndex).line - 1
                        )
                    )
                    newTextToMatch.push({
                        text: match[3],
                        offset: textObj.offset + envRegex.lastIndex - match[0].length + match[1].length
                    })
                    match = envRegex.exec(textObj.text)
                }
            })
            textToMatch = newTextToMatch
        }
        return ranges
    }
}
