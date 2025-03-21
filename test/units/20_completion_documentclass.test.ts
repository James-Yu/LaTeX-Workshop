import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, get, mock } from './utils'
import { provider } from '../../src/completion/completer/class'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    const fixture = path.basename(__filename).split('.')[0]
    const texPath = get.path(fixture, 'main.tex')

    before(() => {
        mock.init(lw, 'root', 'cache', 'parser', 'completion')
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.completion->documentclass', () => {
        function getSuggestions() {
            return provider.from(['', ''], {
                uri: lw.file.toUri(texPath),
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
