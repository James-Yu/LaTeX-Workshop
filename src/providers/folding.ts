import * as vscode from 'vscode'

export class FoldingProvider implements vscode.FoldingRangeProvider {

    public provideFoldingRanges(
        document: vscode.TextDocument,
        _context: vscode.FoldingContext,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FoldingRange[]> {
        return [...this.getSectionFoldingRanges(document), ...this.getEnvironmentFoldingRanges(document)]
    }

    private getSectionFoldingRanges(document: vscode.TextDocument) {
        let lines = document.getText().split(/\r?\n/g)

        let sections = lines.map((lineText, lineNumber) => {
            const sectionRegex = /^\\((?:sub)*)section{.*}/
            let matches
            if (matches = sectionRegex.exec(lineText)) {
                let section = {}
                section["level"] = matches[1].length / 3 + 1
                section["lineNumber"] = lineNumber
                return section
            } else {
                return {}
            }
        })

        return sections.filter(section => section["level"]).map((section, index, sections) => {
            let startLine = section["lineNumber"]
            let endLine
            if (index < sections.length - 1) { // Not the last section
                for (let siblingSectionIndex = index + 1; siblingSectionIndex < sections.length; siblingSectionIndex++) {
                    if (section["level"] >= sections[siblingSectionIndex]["level"]) {
                        endLine = sections[siblingSectionIndex]["lineNumber"] - 1
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

            if (document.lineAt(endLine).isEmptyOrWhitespace && endLine >= section["lineNumber"] + 1) {
                endLine = endLine - 1;
            }

            return new vscode.FoldingRange(startLine, endLine)
        })
    }

    private getEnvironmentFoldingRanges(document: vscode.TextDocument) {
        let ranges: vscode.FoldingRange[] = []
        let textToMatch = [{ text: document.getText(), offset: 0 }]
        while (textToMatch.length > 0) {
            let newTextToMatch: { text: string, offset: number }[] = []
            textToMatch.forEach(textObj => {
                const envRegex = /(\\begin{(.*?)})([\w\W]*)\\end{\2}/g;
                let match
                while (match = envRegex.exec(textObj.text)) {
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