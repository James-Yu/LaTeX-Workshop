import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, get, mock, set } from './utils'
import { provider } from '../../src/completion/completer/class'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const texPath = get.path(fixture, 'main.tex')
    let readStub: sinon.SinonStub

    before(() => {
        mock.init(lw, 'root', 'cache', 'parser', 'completion')
        readStub = sinon.stub(lw.file, 'read')
    })

    beforeEach(async () => {
        set.root(texPath)
        readStub.resolves('\\usepackage{import}\n\\usepackage[savemem]{listings}')
        await lw.cache.refreshCache(texPath)
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.completion->documentclass', () => {
        function getSuggestions() {
            return provider.from(['', ''], {
                uri: vscode.Uri.file(texPath),
                langId: 'latex',
                line: '',
                position: new vscode.Position(0, 0),
            })
        }

        function getClasses() {
            return getSuggestions().map((s) => s.label)
        }

        it('should provide \\documentclass suggestions', () => {
            const labels = getClasses()

            assert.ok(labels.includes('article'))
        })
    })
})
