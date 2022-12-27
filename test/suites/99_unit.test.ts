import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import glob from 'glob'

import { Extension, activate } from '../../src/main'
import { assertKeys, runTest } from './utils'
import type { PkgType } from '../../src/providers/completion'
import type { CmdType } from '../../src/providers/completer/command'
import { EnvSnippetType, EnvType } from '../../src/providers/completer/environment'
import { SectionNodeProvider } from '../../src/providers/structure'
import { ITextDocumentLike, TextDocumentLike } from '../../src/providers/preview/mathpreviewlib/textdocumentlike'
import { TeXMathEnvFinder } from '../../src/providers/preview/mathpreviewlib/texmathenvfinder'
import { CursorRenderer } from '../../src/providers/preview/mathpreviewlib/cursorrenderer'
import { isTriggerSuggestNeeded } from '../../src/providers/completer/commandlib/commandfinder'
import { ChkTeX } from '../../src/components/linterlib/chktex'
import { LaCheck } from '../../src/components/linterlib/lacheck'


suite('Unit test suite', () => {

    let extension: Extension | undefined
    const extensionRoot = path.resolve(__dirname, '../../')
    const suiteName = path.basename(__filename).replace('.test.js', '')

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.numbers.enabled', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.sections', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.floats.enabled', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.fastparse.enabled', undefined)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'check default environment .json completion file'}, (_: string) => {
        const file = `${extensionRoot}/data/environments.json`
        const envs = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: EnvType}
        assert.ok(Object.keys(envs).length > 0)
        Object.keys(envs).forEach(name => {
            assertKeys(
                Object.keys(envs[name]),
                ['name'],
                ['snippet', 'detail'],
                file + ': ' + JSON.stringify(envs[name])
            )
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'check default commands .json completion file'}, (_: string) => {
        const file = `${extensionRoot}/data/commands.json`
        const cmds = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: CmdType}
        assert.ok(Object.keys(cmds).length > 0)
        Object.keys(cmds).forEach(name => {
            assertKeys(
                Object.keys(cmds[name]),
                ['command'],
                ['snippet', 'documentation', 'detail', 'postAction', 'label'],
                file + ': ' + JSON.stringify(cmds[name])
            )
        })
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'test default envs'}, (_: string) => {
        assert.ok(extension)
        let defaultEnvs = extension.completer.environment.getDefaultEnvs(EnvSnippetType.AsCommand).map(e => e.label)
        assert.ok(defaultEnvs.includes('document'))
        assert.ok(defaultEnvs.includes('align'))
        defaultEnvs = extension.completer.environment.getDefaultEnvs(EnvSnippetType.AsName).map(e => e.label)
        assert.ok(defaultEnvs.includes('document'))
        assert.ok(defaultEnvs.includes('align'))
        defaultEnvs = extension.completer.environment.getDefaultEnvs(EnvSnippetType.ForBegin).map(e => e.label)
        assert.ok(defaultEnvs.includes('document'))
        assert.ok(defaultEnvs.includes('align'))
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'test default cmds'}, (_: string) => {
        assert.ok(extension)
        const defaultCommands = extension.completer.command.getDefaultCmds().map(e => e.label)
        assert.ok(defaultCommands.includes('\\begin'))
        assert.ok(defaultCommands.includes('\\left('))
        assert.ok(defaultCommands.includes('\\section{title}'))
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'check package .json completion file'}, (_: string) => {
        const files = glob.sync('data/packages/*.json', {cwd: extensionRoot})
        files.forEach(file => {
            const pkg = JSON.parse(fs.readFileSync(path.join(extensionRoot, file), {encoding: 'utf8'})) as PkgType
            // assert.ok(Object.keys(cmds).length > 0)
            Object.keys(pkg.cmds).forEach(name => {
                assertKeys(
                    Object.keys(pkg.cmds[name]),
                    [],
                    ['command', 'snippet', 'option', 'keyvals', 'keyvalindex', 'documentation', 'detail'],
                    file + ': ' + JSON.stringify(pkg.cmds[name])
                )
            })

            // assert.ok(Object.keys(envs).length > 0)
            Object.keys(pkg.envs).forEach(name => {
                assertKeys(
                    Object.keys(pkg.envs[name]),
                    [],
                    ['name', 'snippet', 'detail', 'option', 'keyvals', 'keyvalindex'],
                    file + ': ' + JSON.stringify(pkg.envs[name])
                )
            })
        })
    })


    runTest({suiteName, fixtureName: 'basic', testName: 'test isTriggerSuggestNeeded'}, (_: string) => {
        assert.ok(!isTriggerSuggestNeeded('frac'))
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'test structure'}, async (_: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_019.tex'])
        await extension?.manager.findRoot()
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections.length, 6)
        assert.strictEqual(sections[0].children.length, 3)
        assert.strictEqual(sections[0].children[1].children.length, 2)
        assert.strictEqual(sections[0].children[1].children[0].label, '#label: sec11')
        assert.strictEqual(sections[0].children[1].children[0].lineNumber, 8)
        assert.strictEqual(sections[1].children.length, 1)
        assert.strictEqual(sections[1].children[0].label, '2.0.1 2.0.1')
        assert.strictEqual(sections[3].label, '4 4 A long title split over two lines')
        assert.strictEqual(sections[4].label, '* No \\textit{Number} Section')
        assert.strictEqual(sections[5].label, '5 Section pdf Caption')
        assert.strictEqual(sections[5].children[0].label, 'Figure: Untitled')
        assert.strictEqual(sections[5].children[1].label, 'Figure: Figure Caption')
        assert.strictEqual(sections[5].children[2].label, 'Table: Table Caption')
        assert.strictEqual(sections[5].children[3].label, 'Frame: Frame Title 1')
        assert.strictEqual(sections[5].children[4].label, 'Frame: Frame Title 2')
        assert.strictEqual(sections[5].children[5].label, 'Frame: Untitled')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'view.outline.numbers.enabled'}, async (_: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_019.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.numbers.enabled', false)
        await extension?.manager.findRoot()
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[1].children[0].label, '2.0.1')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'view.outline.sections'}, async (_: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_019.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.sections', ['section', 'altsection', 'subsubsection'])
        await extension?.manager.findRoot()
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[0].children.length, 2)
        assert.strictEqual(sections[0].children[1].label, '1.1 1.1?')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'view.outline.floats.enabled'}, async (_: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_019.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.floats.enabled', false)
        await extension?.manager.findRoot()
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[5].children.length, 3)
        assert.strictEqual(sections[5].children[0].label, 'Frame: Frame Title 1')
        assert.strictEqual(sections[5].children[1].label, 'Frame: Frame Title 2')
        assert.strictEqual(sections[5].children[2].label, 'Frame: Untitled')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'view.outline.fastparse.enabled'}, async (_: string) => {
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', ['main_019.tex'])
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.fastparse.enabled', true)
        await extension?.manager.findRoot()
        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)
        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections.length, 6)
        assert.strictEqual(sections[0].children.length, 3)
        assert.strictEqual(sections[0].children[1].children.length, 2)
        assert.strictEqual(sections[0].children[1].children[0].label, '#label: sec11')
        assert.strictEqual(sections[0].children[1].children[0].lineNumber, 8)
        assert.strictEqual(sections[1].children.length, 1)
        assert.strictEqual(sections[1].children[0].label, '2.0.1 2.0.1')
        assert.strictEqual(sections[3].label, '4 4 A long title split over two lines')
        assert.strictEqual(sections[4].label, '* No \\textit{Number} Section')
        assert.strictEqual(sections[5].label, '5 Section pdf Caption')
        assert.strictEqual(sections[5].children[0].label, 'Figure: Untitled')
        assert.strictEqual(sections[5].children[1].label, 'Figure: Figure Caption')
        assert.strictEqual(sections[5].children[2].label, 'Table: Table Caption')
        assert.strictEqual(sections[5].children[3].label, 'Frame: Frame Title 1')
        assert.strictEqual(sections[5].children[4].label, 'Frame: Frame Title 2')
        assert.strictEqual(sections[5].children[5].label, 'Frame: Untitled')
    })


    runTest({suiteName, fixtureName: 'basic', testName: 'mathpreviewlib/textdocumentlike: test load and getWordRangeAtPosition'}, (fixture: string) => {
        const s =
`\\documentclass{article}
\\begin{document}

abc

\\end{document}
`
        const a = TextDocumentLike.load(path.join(fixture, 'main_001.tex'))
        assert.strictEqual(s, a.getText())

        const docLike = new TextDocumentLike(s)
        const pos = new vscode.Position(0,0)
        assert.strictEqual('\\documentclass{article}', docLike.lineAt(pos.line).text)
        assert.strictEqual('\\documentclass{article}', docLike.lineAt(pos).text)
        let range = docLike.getWordRangeAtPosition(pos)
        assert.strictEqual('\\documentclass', docLike.getText(range))
        range = docLike.getWordRangeAtPosition(new vscode.Position(1, 0))
        assert.strictEqual('\\begin', docLike.getText(range))
        range = docLike.getWordRangeAtPosition(new vscode.Position(2, 0))
        assert.strictEqual(undefined, range)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'mathpreviewlib/textdocumentlike: test TextDocument is assignable to ITextDocumentLike'}, (_: string) => {
        let doc: vscode.TextDocument | undefined
        const a: ITextDocumentLike | undefined = doc
        assert.ok(!a)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'mathpreviewlib/cursorrenderer: test insertCursor'}, async (_: string) => {
        const docString = '$a+b$'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 2)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        assert.ok(extension)
        const renderer = new CursorRenderer(extension)
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '${~a|+b~}$')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'mathpreviewlib/cursorrenderer: test shouldNotWriteCursor'}, (_: string) => {
        const docString = '$a+b$'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 0)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        assert.ok(extension)
        const renderer = new CursorRenderer(extension)

        const result = renderer.isCursorInsideTexMath(texMath.range, cursorPos)
        assert.strictEqual(result, false)

        const cursorPos1 = new vscode.Position(0, 1)
        const result1 = renderer.isCursorInsideTexMath(texMath.range, cursorPos1)
        assert.strictEqual(result1, true)

        const cursorPos4 = new vscode.Position(0, 4)
        const result4 = renderer.isCursorInsideTexMath(texMath.range, cursorPos4)
        assert.strictEqual(result4, true)

        const cursorPos5 = new vscode.Position(0, 5)
        const result5 = renderer.isCursorInsideTexMath(texMath.range, cursorPos5)
        assert.strictEqual(result5, false)

    })

    runTest({suiteName, fixtureName: 'basic', testName: 'mathpreviewlib/cursorrenderer: test \\f|rac{1}{2}'}, async (_: string) => {
        const docString = '$\\frac{1}{2}$'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 3)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        assert.ok(extension)
        const renderer = new CursorRenderer(extension)
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$\\frac{1}{2}$')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'mathpreviewlib/cursorrenderer: test a^|b'}, async (_: string) => {
        const docString = '$a^b$'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 3)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        assert.ok(extension)
        const renderer = new CursorRenderer(extension)
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a^{~|b~}$')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'mathpreviewlib/cursorrenderer: test $a^b| $'}, async (_: string) => {
        const docString = '$a^b $'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 4)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        assert.ok(extension)
        const renderer = new CursorRenderer(extension)
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '${~a^b|~} $')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'mathpreviewlib/cursorrenderer: test $a^{b} $'}, async (_: string) => {
        const docString = '$a^{b} $'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 5)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        assert.ok(extension)
        const renderer = new CursorRenderer(extension)
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a^{~b|~} $')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'mathpreviewlib/cursorrenderer: test a_|b'}, async (_: string) => {
        const docString = '$a_b$'
        const doc = new TextDocumentLike(docString)
        const finder = new TeXMathEnvFinder()
        const cursorPos = new vscode.Position(0, 3)
        const texMath = finder.findMathEnvIncludingPosition(doc, cursorPos)
        assert.ok(texMath)
        assert.ok(extension)
        const renderer = new CursorRenderer(extension)
        const result = texMath && await renderer.insertCursor(texMath, cursorPos, '|')
        assert.strictEqual(result, '$a_{~|b~}$')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'test chktex'}, async (fixture: string) => {
        const texFilePath = path.join(fixture, 'main_020.tex')
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const linter = new ChkTeX(extension)
        await linter.lintRootFile()
        assert.strictEqual(linter.linterDiagnostics.name, 'ChkTeX')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'test chktex log parser'}, (fixture: string) => {
        const texFilePath = path.join(fixture, 'main_020.tex')
        const subFilePath = path.join(fixture, 'sub_020/sub.tex')
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const linter = new ChkTeX(extension)
        const log = fs.readFileSync(path.join(fixture, 'chktex.linterlog')).toString()
        linter.parseLog(log)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(texFilePath))?.length, 1)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(subFilePath))?.length, 1)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(texFilePath))?.[0].message || '', /Delete this space/)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(subFilePath))?.[0].message || '', /Delete this space/)
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'test lacheck'}, async (fixture: string) => {
        const texFilePath = path.join(fixture, 'main_020.tex')
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const linter = new LaCheck(extension)
        await linter.lintRootFile()
        assert.strictEqual(linter.linterDiagnostics.name, 'LaCheck')
    })

    runTest({suiteName, fixtureName: 'basic', testName: 'test lacheck log parser'}, (fixture: string) => {
        const texFilePath = path.join(fixture, 'main_020.tex')
        const subFilePath = path.join(fixture, 'sub_020/sub.tex')
        assert.ok(extension)
        extension.manager.rootFile = texFilePath
        const linter = new LaCheck(extension)
        const log = fs.readFileSync(path.join(fixture, 'lacheck.linterlog')).toString()
        linter.parseLog(log)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(texFilePath))?.length, 1)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(subFilePath))?.length, 1)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(texFilePath))?.[0].message || '', /double space at/)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(subFilePath))?.[0].message || '', /double space at/)
    })
})
