import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../../src/lw'
import { citation, provider } from '../../../src/completion/completer/citation'
import type { CitationItem } from '../../../src/types'
import { assert, get, set } from '../utils'

describe(path.basename(__filename).split('.')[0] + ': multiroot', () => {
    const projectA = get.workspace('project_A')!
    const projectB = get.workspace('project_B')!
    const texA = path.resolve(projectA.uri.fsPath, 'citation/main.tex')
    const texB = path.resolve(projectB.uri.fsPath, 'citation/main.tex')
    const bib = path.resolve(projectA.uri.fsPath, 'citation/main.bib')

    before(() => {
        sinon.stub(lw.cache, 'getIncludedBib').returns([bib])
        sinon.stub(lw.cache, 'getIncludedTeX').returns(new Set())
    })

    after(() => {
        sinon.restore()
    })

    function suggestionFor(texPath: string) {
        return (provider.from([''], {
            uri: vscode.Uri.file(texPath),
            langId: 'latex',
            line: '\\cite{',
            position: new vscode.Position(0, 6)
        }) as CitationItem[]).find(item => item.key === 'art1')
    }

    it('should resolve citation labels from the document workspace folder', async () => {
        await set.codeConfig('bibtex.maxFileSize', 5, projectA)
        await set.codeConfig('intellisense.citation.label', 'bibtex key')
        await set.codeConfig('intellisense.citation.label', 'title', projectA)
        lw.root.file.path = texA
        await citation.parseBibFile(bib)

        assert.strictEqual(suggestionFor(texA)?.label, 'A fake article')
        assert.strictEqual(suggestionFor(texB)?.label, 'art1')
    })
})
