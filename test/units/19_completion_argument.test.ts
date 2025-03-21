import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { assert, get, mock, set } from './utils'
import { provider } from '../../src/completion/completer/argument'

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
        readStub.resolves('\\usepackage{acro}\n\\usepackage[savemem]{listings}')
        await lw.cache.refreshCache(texPath)
    })

    after(() => {
        sinon.restore()
    })

    describe('lw.completion->argument', () => {
        function getSuggestions(match: RegExpMatchArray) {
            return provider.from(match, {
                uri: lw.file.toUri(texPath),
                langId: 'latex',
                line: match[0],
                position: new vscode.Position(0, 0),
            })
        }

        function getArgs(match: RegExpMatchArray) {
            return getSuggestions(match).map((s) => s.label)
        }

        it('should provide \\usepackage arguments', () => {
            const labels = getArgs(['\\usepackage[]{listings}', 'usepackage', ''])
            assert.ok(labels.includes('savemem'))
        })

        it('should provide \\documentclass arguments of default LaTeX classes', () => {
            let labels = getArgs(['\\documentclass[]{article}', 'documentclass', ''])
            assert.ok(labels.includes('a4paper'))

            labels = getArgs(['\\documentclass[]{report}', 'documentclass', ''])
            assert.ok(labels.includes('a4paper'))

            labels = getArgs(['\\documentclass[]{book}', 'documentclass', ''])
            assert.ok(labels.includes('a4paper'))
        })

        it('should provide \\documentclass arguments of custom LaTeX classes', () => {
            let labels = getArgs(['\\documentclass[]{article}', 'documentclass', ''])
            assert.ok(!labels.includes('sans'))

            labels = getArgs(['\\documentclass[]{moderncv}', 'documentclass', ''])
            assert.ok(labels.includes('sans'))
        })

        it('should provide macro arguments', () => {
            const labels = getArgs(['\\lstinline[]|code|', 'lstinline', ''])
            assert.ok(labels.includes('showlines'))
        })

        it('should provide macro arguments not at the first position', () => {
            const labels = getArgs(['\\DeclareAcronym{acronym}{', 'DeclareAcronym', '{acronym}'])
            assert.ok(labels.some(label => label.toString().startsWith('short=')))
        })

        it('should provide macro arguments if there are multiple keyval sets defined in package JSON file', () => {
            const labels = getArgs(['\\DeclareAcronym{acronym}{', 'DeclareAcronym', '{acronym}'])
            // The `case-sensitive` keyval is in the second keyval set of macro DeclareAcronym
            assert.ok(labels.some(label => label.toString().startsWith('case-sensitive')))
        })

        it('should provide environment arguments', () => {
            const labels = getArgs(['\\begin{lstlisting}[]', 'begin', '{lstlisting}'])
            assert.ok(labels.includes('showlines'))
        })
    })
})
