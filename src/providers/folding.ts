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

            // Not the last section
            if (allSections.filter((element, elementIndex) => index < elementIndex && element['level'] <= section['level']).length > 0) {
                for (let siblingSectionIndex = index + 1; siblingSectionIndex < allSections.length; siblingSectionIndex++) {
                    if (section['level'] >= allSections[siblingSectionIndex]['level']) {
                        endLine = allSections[siblingSectionIndex]['lineNumber'] - 1
                        break
                    }
                }
            } else {
                endLine = document.lineCount - 1
                // Handle included files which don't contain \end{document}
                for (let endLineCopy = endLine; endLineCopy > startLine; endLineCopy--) {
                    if (/\\end{document}/.test(document.lineAt(endLineCopy).text)) {
                        endLine = endLineCopy--
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
        const opStack: { keyword: string, index: number }[] = []
        const text: string =  document.getText()
        const envRegex: RegExp = /(\\(begin){(.*?)})|(\\(end){(.*?)})/g //to match one 'begin' OR 'end'

        let match = envRegex.exec(text) // init regex search
        while (match) {
            //for 'begin': match[2] contains 'begin', match[3] contains keyword
            //fro 'end':   match[5] contains 'end',   match[6] contains keyword
            const item = {
                keyword: match[2] ? match[3] : match[6],
                index: match.index
            }
            const lastItem = opStack[opStack.length - 1]

            if (match[5] && lastItem && lastItem.keyword === item.keyword) { // match 'end' with its 'begin'
                opStack.pop()
                ranges.push(new vscode.FoldingRange(
                    document.positionAt(lastItem.index).line,
                    document.positionAt(item.index).line - 1
                ))
            } else {
                opStack.push(item)
            }

            match = envRegex.exec(text) //iterate regex search
        }
        //TODO: if opStack still not empty
        return ranges
    }
}
