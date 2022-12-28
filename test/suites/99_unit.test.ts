import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'
import glob from 'glob'

import { Extension, activate } from '../../src/main'
import { runTest, writeTeX } from './utils'
import type { PkgType } from '../../src/providers/completion'
import type { CmdType } from '../../src/providers/completer/command'
import { EnvSnippetType, EnvType } from '../../src/providers/completer/environment'
import { SectionNodeProvider } from '../../src/providers/structure'
import { TeXMathEnvFinder } from '../../src/providers/preview/mathpreviewlib/texmathenvfinder'
import { CursorRenderer } from '../../src/providers/preview/mathpreviewlib/cursorrenderer'
import { isTriggerSuggestNeeded } from '../../src/providers/completer/commandlib/commandfinder'
import { ChkTeX } from '../../src/components/linterlib/chktex'
import { LaCheck } from '../../src/components/linterlib/lacheck'
import { TextDocumentLike } from '../../src/providers/preview/mathpreviewlib/textdocumentlike'


suite('Unit test suite', () => {

    let extension: Extension | undefined
    let extensionRoot = path.resolve(__dirname, '../../')
    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
        assert.ok(extension)
        extensionRoot = extension.extensionRoot
        fixture = path.resolve(extension.extensionRoot, 'test/fixtures/testground')
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        await vscode.workspace.getConfiguration().update('latex-workshop.latex.search.rootFiles.include', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.numbers.enabled', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.sections', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.floats.enabled', undefined)
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.fastparse.enabled', undefined)
    })

    function assertKeys(keys: string[], mendatory: string[], optional: string[] = [], message: string): void {
        assert.ok(
            keys.every(k => mendatory.includes(k) || optional.includes(k)) && mendatory.every(k => keys.includes(k)),
            message
        )
    }

    runTest({suiteName, fixtureName, testName: 'check default environment .json completion file'}, () => {
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

    runTest({suiteName, fixtureName, testName: 'check default commands .json completion file'}, () => {
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

    runTest({suiteName, fixtureName, testName: 'test default envs'}, () => {
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

    runTest({suiteName, fixtureName, testName: 'test default cmds'}, () => {
        assert.ok(extension)
        const defaultCommands = extension.completer.command.getDefaultCmds().map(e => e.label)
        assert.ok(defaultCommands.includes('\\begin'))
        assert.ok(defaultCommands.includes('\\left('))
        assert.ok(defaultCommands.includes('\\section{title}'))
    })

    runTest({suiteName, fixtureName, testName: 'check package .json completion file'}, () => {
        const files = glob.sync('data/packages/*.json', {cwd: extensionRoot})
        files.forEach(file => {
            const pkg = JSON.parse(fs.readFileSync(path.join(extensionRoot, file), {encoding: 'utf8'})) as PkgType
            Object.keys(pkg.cmds).forEach(name => {
                assertKeys(
                    Object.keys(pkg.cmds[name]),
                    [],
                    ['command', 'snippet', 'option', 'keyvals', 'keyvalindex', 'documentation', 'detail'],
                    file + ': ' + JSON.stringify(pkg.cmds[name])
                )
            })
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

    runTest({suiteName, fixtureName, testName: 'test isTriggerSuggestNeeded'}, () => {
        assert.ok(!isTriggerSuggestNeeded('frac'))
    })

    runTest({suiteName, fixtureName, testName: 'test structure'}, async () => {
        await writeTeX('structure', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
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
        assert.strictEqual(sections[0].children[1].children[0].lineNumber, 5)
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

    runTest({suiteName, fixtureName, testName: 'test view.outline.numbers.enabled'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.numbers.enabled', false)
        await writeTeX('structure', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()

        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)

        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[1].children[0].label, '2.0.1')
    })

    runTest({suiteName, fixtureName, testName: 'test view.outline.sections'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.sections', ['section', 'altsection', 'subsubsection'])
        await writeTeX('structure', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()

        assert.ok(extension)
        const structure = new SectionNodeProvider(extension)
        await structure.update(true)

        const sections = structure.ds
        assert.ok(sections)
        assert.strictEqual(sections[0].children.length, 2)
        assert.strictEqual(sections[0].children[1].label, '1.1 1.1?')
    })

    runTest({suiteName, fixtureName, testName: 'test view.outline.floats.enabled'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.floats.enabled', false)
        await writeTeX('structure', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
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

    runTest({suiteName, fixtureName, testName: 'test view.outline.fastparse.enabled'}, async () => {
        await vscode.workspace.getConfiguration().update('latex-workshop.view.outline.fastparse.enabled', true)
        await writeTeX('structure', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
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
        assert.strictEqual(sections[0].children[1].children[0].lineNumber, 5)
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
    runTest({suiteName, fixtureName, testName: 'mathpreviewlib/cursorrenderer: test insertCursor'}, async () => {
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

    runTest({suiteName, fixtureName, testName: 'mathpreviewlib/cursorrenderer: test shouldNotWriteCursor'}, () => {
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

    runTest({suiteName, fixtureName, testName: 'mathpreviewlib/cursorrenderer: test \\f|rac{1}{2}'}, async () => {
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

    runTest({suiteName, fixtureName, testName: 'mathpreviewlib/cursorrenderer: test a^|b'}, async () => {
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

    runTest({suiteName, fixtureName, testName: 'mathpreviewlib/cursorrenderer: test $a^b| $'}, async () => {
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

    runTest({suiteName, fixtureName, testName: 'mathpreviewlib/cursorrenderer: test $a^{b} $'}, async () => {
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

    runTest({suiteName, fixtureName, testName: 'mathpreviewlib/cursorrenderer: test a_|b'}, async () => {
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

    runTest({suiteName, fixtureName, testName: 'test chktex'}, async () => {
        await writeTeX('structure', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()

        assert.ok(extension)
        const linter = new ChkTeX(extension)
        await linter.lintRootFile()
        assert.strictEqual(linter.linterDiagnostics.name, 'ChkTeX')
    })

    runTest({suiteName, fixtureName, testName: 'test chktex log parser'}, async () => {
        await writeTeX('structure', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()

        assert.ok(extension)
        const linter = new ChkTeX(extension)
        const log = 'main.tex:5:18:1:Warning:24:Delete this space to maintain correct pagereferences.\nsub/s.tex:1:26:1:Warning:24:Delete this space to maintain correct pagereferences.\n'
        linter.parseLog(log)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.length, 1)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.length, 1)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.[0].message || '', /Delete this space/)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.[0].message || '', /Delete this space/)
    })

    runTest({suiteName, fixtureName, testName: 'test lacheck'}, async () => {
        await writeTeX('structure', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()

        assert.ok(extension)
        const linter = new LaCheck(extension)
        await linter.lintRootFile()
        assert.strictEqual(linter.linterDiagnostics.name, 'LaCheck')
    })

    runTest({suiteName, fixtureName, testName: 'test lacheck log parser'}, async () => {
        await writeTeX('structure', fixture)
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(fixture, 'main.tex')))
        await vscode.window.showTextDocument(doc)
        await extension?.manager.findRoot()

        assert.ok(extension)
        const linter = new LaCheck(extension)
        const log = '"main.tex", line 7: double space at "~~"\n** sub/sub:\n"sub/s.tex", line 2: double space at "~~"\n'
        linter.parseLog(log)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.length, 1)
        assert.strictEqual(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.length, 1)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'main.tex')))?.[0].message || '', /double space at/)
        assert.match(linter.linterDiagnostics.get(vscode.Uri.file(path.resolve(fixture, 'sub/s.tex')))?.[0].message || '', /double space at/)
    })
})
