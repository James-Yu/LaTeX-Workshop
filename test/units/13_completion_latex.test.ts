import * as vscode from 'vscode'
import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { get, mock, type TextDocument } from './utils'
import { provider as citationProvider } from '../../src/completion/completer/citation'
import { provider as referenceProvider } from '../../src/completion/completer/reference'
import { provider as environmentProvider } from '../../src/completion/completer/environment'
import { provider as macroProvider } from '../../src/completion/completer/macro'
import { provider as argumentProvider } from '../../src/completion/completer/argument'
import { provider as packageProvider } from '../../src/completion/completer/package'
import { provider as classProvider } from '../../src/completion/completer/class'
import { inputProvider, importProvider, subimportProvider } from '../../src/completion/completer/input'
import { provider as glossaryProvider } from '../../src/completion/completer/glossary'
import { provider as subsuperscriptProvider } from '../../src/completion/completer/subsuperscript'
import { provider as closeenvProvider } from '../../src/completion/completer/closeenv'
import assert from 'assert'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    let document: TextDocument
    let citationSpy: sinon.SinonSpy
    let referenceSpy: sinon.SinonSpy
    let environmentSpy: sinon.SinonSpy
    let macroSpy: sinon.SinonSpy
    let argumentSpy: sinon.SinonSpy
    let packageSpy: sinon.SinonSpy
    let classSpy: sinon.SinonSpy
    let inputSpy: sinon.SinonSpy
    let importSpy: sinon.SinonSpy
    let subimportSpy: sinon.SinonSpy
    let glossarySpy: sinon.SinonSpy
    let subsuperscriptSpy: sinon.SinonSpy
    let closeenvSpy: sinon.SinonSpy

    before(() => {
        mock.init(lw, 'root', 'cache', 'completion')
        mock.activeTextEditor(get.path('main.tex'), '', {
            languageId: 'latex',
        })
        document = vscode.window.activeTextEditor?.document as TextDocument
        citationSpy = sinon.spy(citationProvider, 'from')
        referenceSpy = sinon.spy(referenceProvider, 'from')
        environmentSpy = sinon.spy(environmentProvider, 'from')
        macroSpy = sinon.spy(macroProvider, 'from')
        argumentSpy = sinon.spy(argumentProvider, 'from')
        packageSpy = sinon.spy(packageProvider, 'from')
        classSpy = sinon.spy(classProvider, 'from')
        inputSpy = sinon.spy(inputProvider, 'from')
        importSpy = sinon.spy(importProvider, 'from')
        subimportSpy = sinon.spy(subimportProvider, 'from')
        glossarySpy = sinon.spy(glossaryProvider, 'from')
        subsuperscriptSpy = sinon.spy(subsuperscriptProvider, 'from')
        closeenvSpy = sinon.spy(closeenvProvider, 'from')
    })

    after(() => {
        sinon.restore()
    })

    function provide(content: string, position?: number, line: number = 0) {
        document.setContent(content)
        if (position === undefined) {
            position = content.length
        }
        const pos = new vscode.Position(line, position)
        return lw.completion.provider.provideCompletionItems(document, pos)
    }

    describe('lw.completion->latex', () => {
        beforeEach(() => {
            document.setLanguage('latex')
        })

        it('should invoke citation provider', () => {
            const lines = [
                '\\cite{',
                '\\Cite{',
                '\\abccite{',
                '\\citeabc{',
                '\\bibentry{',
                '\\bibentry{source1',
                '\\cite(source1){',
                '\\cite[source2]{',
                '\\cite(John, 2020){source',
                '\\Cite{source1',
                '\\cite<author>{',
                '\\cite[description]{text',
            ]

            for (const line of lines) {
                citationSpy.resetHistory()
                provide(line)
                assert.strictEqual(citationSpy.callCount, 1, line)
            }
        })

        it('should invoke reference provider', () => {
            const lines = [
                '\\ref{',
                '\\hyperref[section',
                '\\myref{item',
                '\\customref*[section]{',
                '\\Caarefrange{start',
                '\\somethingrefrange*{start',
            ]

            for (const line of lines) {
                referenceSpy.resetHistory()
                provide(line)
                assert.strictEqual(referenceSpy.callCount, 1, line)
            }
        })

        it('should invoke environment provider', () => {
            const lines = [
                '\\begin{',
                '\\end{',
                '\\begin{environment',
                '\\end{environment'
            ]

            for (const line of lines) {
                environmentSpy.resetHistory()
                provide(line)
                assert.strictEqual(environmentSpy.callCount, 1, line)
            }
        })

        it('should invoke macro provider', () => {
            const lines = [
                '\\',
                '\\command',
                '\\Bigl(',
                '\\Biggl{',
                '\\left[',
            ]

            for (const line of lines) {
                macroSpy.resetHistory()
                provide(line)
                assert.strictEqual(macroSpy.callCount, 1, line)
            }
        })

        it('should invoke LaTeX3 macro provider', () => {
            const lines = [
                '\\',
                '\\command',
                '\\command@',
                '\\command:subcommand'
            ]

            document.setLanguage('latex-expl3')
            for (const line of lines) {
                macroSpy.resetHistory()
                provide(line)
                assert.strictEqual(macroSpy.callCount, 1, line)
            }
        })

        it('should invoke argument provider', () => {
            const lines = [
                '\\command[arg]{arg}[',
                '\\command[arg]{arg}{'
            ]

            for (const line of lines) {
                argumentSpy.resetHistory()
                provide(line)
                assert.strictEqual(argumentSpy.callCount, 1, line)
            }
        })

        it('should invoke LaTeX3 argument provider', () => {
            const lines = [
                '\\command@[arg]{arg}[',
                '\\command:subcommand[arg]{arg}{'
            ]

            document.setLanguage('latex-expl3')
            for (const line of lines) {
                argumentSpy.resetHistory()
                provide(line)
                assert.strictEqual(argumentSpy.callCount, 1, line)
            }
        })

        it('should remove all existing completed arguments before passing to argument provider', () => {
            argumentSpy.resetHistory()
            provide('\\command[arg]{arg}{')
            assert.strictEqual(argumentSpy.getCall(0)?.args[0]?.[0], '\\command{')
        })

        it('should invoke package provider', () => {
            const lines = [
                '\\usepackage{',
                '\\usepackage{package',
                '\\RequirePackage[option]{package',
                '\\RequirePackageWithOptions{package'
            ]

            for (const line of lines) {
                packageSpy.resetHistory()
                provide(line)
                assert.strictEqual(packageSpy.callCount, 1, line)
            }
        })

        it('should invoke documentclass provider', () => {
            const lines = [
                '\\documentclass{',
                '\\documentclass{class',
                '\\documentclass[option]{class'
            ]

            for (const line of lines) {
                classSpy.resetHistory()
                provide(line)
                assert.strictEqual(classSpy.callCount, 1, line)
            }
        })

        it('should invoke input provider', () => {
            const lines = [
                '\\input{',
                '\\input{file',
                '\\include{file',
                '\\subfile{file',
                '\\subfileinclude{file',
                '\\includegraphics{file',
                '\\includesvg{file',
                '\\lstinputlisting{file',
                '\\verbatiminput{file',
                '\\loadglsentries{file',
                '\\markdownInput{file',
                '\\includeonly{',
                '\\includeonly{file1,',
                '\\excludeonly{file1,'
            ]

            for (const line of lines) {
                inputSpy.resetHistory()
                provide(line)
                assert.strictEqual(inputSpy.callCount, 1, line)
            }
        })

        it('should invoke import provider', () => {
            const lines = [
                '\\import{',
                '\\import{path}{file',
                '\\includefrom{path}{file',
                '\\inputfrom*{path}{file'
            ]

            for (const line of lines) {
                importSpy.resetHistory()
                provide(line)
                assert.strictEqual(importSpy.callCount, 1, line)
            }
        })

        it('should invoke subimport provider', () => {
            const lines = [
                '\\subimport{',
                '\\subimport{path}{file',
                '\\subincludefrom{path}{file',
                '\\subinputfrom*{path}{file'
            ]

            for (const line of lines) {
                subimportSpy.resetHistory()
                provide(line)
                assert.strictEqual(subimportSpy.callCount, 1, line)
            }
        })

        it('should invoke glossary provider', () => {
            const lines = [
                '\\gls{',
                '\\gls{term',
                '\\glspl{term',
                '\\glstext{term',
                '\\glsfirst{term',
                '\\glsfmttext{term',
                '\\glsfmtshort{term',
                '\\glsplural{term',
                '\\glsfirstplural{term',
                '\\glsname{term',
                '\\glssymbol{term',
                '\\glsdesc{term',
                '\\glsdisp{term',
                '\\glsuseri{term',
                '\\glsuserii{term',
                '\\glsuseriii{term',
                '\\glsuseriv{term',
                '\\glsuserv{term',
                '\\glsuservi{term',
                '\\Acrlong{term',
                '\\Acrfull{term',
                '\\Acrshort{term',
                '\\Acrlongpl{term',
                '\\Acrfullpl{term',
                '\\Acrshortpl{term',
                '\\ac{term',
                '\\acs{term',
                '\\acf{term',
                '\\acp{term',
                '\\acsp{term'
            ]

            for (const line of lines) {
                glossarySpy.resetHistory()
                provide(line)
                assert.strictEqual(glossarySpy.callCount, 1, line)
            }
        })

        it('should invoke subsuper provider', () => {
            const lines = [
                '^{',
                '_{'
            ]

            for (const line of lines) {
                subsuperscriptSpy.resetHistory()
                provide(line)
                assert.strictEqual(subsuperscriptSpy.callCount, 1, line)
            }
        })

        it('should invoke closeenv provider', () => {
            const lines = [
                '\\begin{env}'
            ]

            for (const line of lines) {
                closeenvSpy.resetHistory()
                provide(line)
                assert.strictEqual(closeenvSpy.callCount, 1, line)
            }
        })
    })
})
