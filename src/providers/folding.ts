import * as vscode from 'vscode'

export class FoldingProvider implements vscode.FoldingRangeProvider {

    public provideFoldingRanges(
        document: vscode.TextDocument,
        _context: vscode.FoldingContext,
        _token: vscode.CancellationToken
    ) : vscode.ProviderResult<vscode.FoldingRange[]> {
        return [...this.getSectionFoldingRanges(document), ...this.getEnvironmentFoldingRanges(document)]
    }

    private getSectionFoldingRanges(document: vscode.TextDocument) {
        const lines = document.getText().split(/\r?\n/g)

        const sections = lines.map((lineText, lineNumber) => {
            const sectionRegex = /^\\((?:sub)*)section{.*}/
            const matches = sectionRegex.exec(lineText)
            if (matches) {
                const section = {}
                section['level'] = matches[1].length / 3 + 1
                section['lineNumber'] = lineNumber
                return section
            } else {
                return {}
            }
        })

        return sections.filter(section => section['level']).map((section, index, allSections) => {
            const startLine = section['lineNumber']
            let endLine
            if (index < allSections.length - 1) { // Not the last section
                for (let siblingSectionIndex = index + 1; siblingSectionIndex < allSections.length; siblingSectionIndex++) {
                    if (section['level'] >= allSections[siblingSectionIndex]['level']) {
                        endLine = allSections[siblingSectionIndex]['lineNumber'] - 1
                        break
                    }
                }
            } else {
                endLine = document.lineCount - 1
                for (; endLine > startLine; endLine--) {
                    if (/\\end{document}/.test(document.lineAt(endLine).text)) {
                        endLine--
                        break
                    }
                }
            }

            if (document.lineAt(endLine).isEmptyOrWhitespace && endLine >= section['lineNumber'] + 1) {
                endLine = endLine - 1
            }

            return new vscode.FoldingRange(startLine, endLine)
        })
    }

    private getEnvironmentFoldingRanges(document: vscode.TextDocument) {
        const ranges: vscode.FoldingRange[] = []
        let textToMatch = [{ text: document.getText(), offset: 0 }]
        while (textToMatch.length > 0) {
            const newTextToMatch: { text: string, offset: number }[] = []
            textToMatch.forEach(textObj => {
                const envRegex = /(\\begin{(.*?)})([\w\W]*)\\end{\2}/g
                const match = envRegex.exec(textObj.text)
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
                }
            })
            textToMatch = newTextToMatch
        }
        return ranges
    }
}
