import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import * as os from 'os'
import * as assert from 'assert'

import { Extension, activate } from '../../src/main'
import { BuildFinished } from '../../src/components/eventbus'

export async function getExtension() {
    await vscode.commands.executeCommand('latex-workshop.activate')
    const extension = vscode.extensions.getExtension<ReturnType<typeof activate>>('James-Yu.latex-workshop')?.exports.extension
    assert.ok(extension)
    return extension
}

export function touch(filePath: string) {
    fs.closeSync(fs.openSync(filePath, 'a'))
}

type RunTestOption = {
    suiteName: string,
    fixtureName: string,
    testName: string,
    timeout?: number,
    only?: boolean,
    win32only?: boolean
}

let testCounter = 0

export function runTest(option: RunTestOption, cb: () => unknown) {
    let fixture: string | undefined
    if (vscode.workspace.workspaceFile) {
        fixture = path.dirname(vscode.workspace.workspaceFile.fsPath)
    } else {
        fixture = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    }

    if (fixture === undefined) {
        return
    }
    if (path.basename(fixture) !== option.fixtureName) {
        return
    }
    if (process.env['LATEXWORKSHOP_SUITE'] && !process.env['LATEXWORKSHOP_SUITE'].split(',').includes(option.suiteName)) {
        return
    }
    if (option.win32only && os.platform() !== 'win32') {
        return
    }

    testCounter++
    const testFunction = (process.env['LATEXWORKSHOP_CLI'] || !option.only) ? test : test.only
    const counterString = testCounter.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false})

    testFunction(`[${counterString}] ${option.suiteName}: ${option.testName}`, async () => {
        try {
            await cb()
        } catch (error) {
            await log(counterString)
            throw error
        }
    }).timeout(option.timeout || 60000)
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function log(counter: string) {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    await sleep(500)
    await vscode.commands.executeCommand('workbench.action.output.toggleOutput')
    await sleep(500)
    await vscode.commands.executeCommand('latex-workshop.log')
    await sleep(500)
    const extensionMessage = vscode.window.activeTextEditor?.document.getText()
    await vscode.commands.executeCommand('latex-workshop.compilerlog')
    await sleep(500)
    const compilerMessage = vscode.window.activeTextEditor?.document.getText()

    const logFolder = path.resolve(__dirname, '../../../test/log')
    fs.mkdirSync(logFolder, {recursive: true})
    fs.writeFileSync(path.resolve(logFolder, `${counter}.extension.log`), extensionMessage || '')
    fs.writeFileSync(path.resolve(logFolder, `${counter}.compiler.log`), compilerMessage || '')
}

type WriteTestOption = {
    fixture: string,
    fileName: string
}

export function writeTestFile(option: WriteTestOption, ...contents: string[]) {
    fs.mkdirSync(path.resolve(option.fixture, path.dirname(option.fileName)), {recursive: true})
    fs.writeFileSync(path.resolve(option.fixture, option.fileName), contents.join('\n'))
}

export function copyTestFile(fixture: string, srcFileName: string, dstFileName: string) {
    fs.mkdirSync(path.resolve(fixture, path.dirname(dstFileName)), {recursive: true})
    fs.copyFileSync(path.resolve(fixture, srcFileName), path.resolve(fixture, dstFileName))
}

type AssertBuildOption = {
    fixture: string,
    texFileName: string,
    pdfFileName: string,
    extension: Extension,
    build?: () => unknown,
    nobuild?: boolean,
    removepdf?: boolean
}

export async function assertBuild(option: AssertBuildOption) {
    const texFilePath = vscode.Uri.file(path.join(option.fixture, option.texFileName))
    const pdfFilePath = path.join(option.fixture, option.pdfFileName)
    const doc = await vscode.workspace.openTextDocument(texFilePath)
    await vscode.window.showTextDocument(doc)
    await option.extension.manager.findRoot()
    if (option.build) {
        await option.build()
    } else {
        await option.extension.commander.build()
    }

    const files = glob.sync('**/**.pdf', { cwd: option.fixture })
    assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), option.pdfFileName === '' ? option.pdfFileName : pdfFilePath)

    if (option.removepdf) {
        files.forEach(async file => {
            if (fs.existsSync(path.join(option.fixture, file))) {
                fs.unlinkSync(path.join(option.fixture, file))
                await sleep(250)
            }
        })
    }
}

export async function assertAutoBuild(option: AssertBuildOption, mode?: ('skipFirstBuild' | 'noAutoBuild' | 'onSave')[]) {
    if (!mode?.includes('skipFirstBuild')) {
        await assertBuild(option)
    }
    fs.rmSync(path.resolve(option.fixture, option.pdfFileName))

    let files = glob.sync('**/**.pdf', { cwd: option.fixture })
    assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), '')
    await sleep(250)

    const wait = waitBuild(option.extension)
    if (mode?.includes('onSave')) {
        await vscode.commands.executeCommand('workbench.action.files.save')
    } else {
        fs.appendFileSync(path.resolve(option.fixture, option.texFileName), ' % edit')
    }

    if (mode?.includes('noAutoBuild')) {
        await sleep(3000)
        files = glob.sync('**/**.pdf', { cwd: option.fixture })
        assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), '')
    } else {
        await wait
        files = glob.sync('**/**.pdf', { cwd: option.fixture })
        assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), path.resolve(option.fixture, option.pdfFileName))
    }
}

export async function waitBuild(extension: Extension) {
    return new Promise<void>((resolve, _) => {
        const disposable = extension.eventBus.on(BuildFinished, () => {
            resolve()
            disposable?.dispose()
        })
    })
}

type AssertRootOption = {
    fixture: string,
    openName: string,
    rootName: string,
    extension: Extension
}

export async function assertRoot(option: AssertRootOption) {
    await vscode.commands.executeCommand('latex-workshop.activate')
    const openFilePath = vscode.Uri.file(path.join(option.fixture, option.openName))
    const rootFilePath = path.join(option.fixture, option.rootName)
    const doc = await vscode.workspace.openTextDocument(openFilePath)
    await vscode.window.showTextDocument(doc)
    const root = await option.extension.manager.findRoot()
    assert.strictEqual(root, rootFilePath)
}

type WriteTeXType = 'main' | 'makeindex' | 'makesubfileindex' | 'magicprogram' | 'magicoption' | 'magicroot' | 'magicinvalidprogram' |
    'subfile' | 'subfileverbatim' | 'subfiletwomain' | 'subfilethreelayer' | 'importthreelayer' | 'bibtex' |
    'input' | 'inputmacro' | 'inputfromfolder' | 'circularinclude' | 'intellisense' | 'structure' | 'linter'

export async function writeTeX(type: WriteTeXType, fixture: string, payload?: {fileName?: string, fileDir?: string}) {
    switch (type) {
        case 'main':
            writeTestFile({fixture, fileName: payload?.fileName || 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
            break
        case 'makeindex':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{makeidx}', '\\makeindex', '\\begin{document}', 'abc\\index{abc}', '\\printindex', '\\end{document}')
            break
        case 'makesubfileindex':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/s.tex'}, '\\documentclass[../main.tex]{subfiles}', '\\usepackage{makeidx}', '\\makeindex', '\\begin{document}', 'abc\\index{abc}', '\\printindex', '\\end{document}')
            break
        case 'magicprogram':
            writeTestFile({fixture, fileName: 'main.tex'}, '% !TEX program = pdflatex', '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
            break
        case 'magicoption':
            writeTestFile({fixture, fileName: 'main.tex'}, '% !TEX program = latexmk', '% !TEX options = -synctex=1 -interaction=nonstopmode -file-line-error -pdf -outdir="./out/" "%DOC%"', '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
            break
        case 'magicroot':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\input{sub/s}', '\\end{document}')
            writeTestFile({fixture, fileName: 'alt.tex'}, '\\documentclass{article}', '\\begin{document}', 'alt alt', '\\input{sub/s}', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/s.tex'}, '% !TEX root = ../main.tex', 'sub sub')
            break
        case 'magicinvalidprogram':
            writeTestFile({fixture, fileName: payload?.fileName || 'main.tex'}, '% !TEX program = noexistprogram', '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
            break
        case 'input':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\input{sub/s}', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/s.tex'}, 'sub sub')
            break
        case 'inputmacro':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\providecommand{\\main}{sub}', '\\begin{document}', 'main main', '\\input{\\main/s}', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/s.tex'}, 'sub sub')
            break
        case 'inputfromfolder':
            writeTestFile({fixture, fileName: 'main/main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\input{../sub/s}', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/s.tex'}, 'sub sub')
            break
        case 'bibtex':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\bibliographystyle{plain}', '\\bibliography{bib}', '\\end{document}')
            writeTestFile({fixture, fileName: 'bib.bib'}, '%')
            break
        case 'subfile':
            writeTestFile({fixture, fileName: (payload?.fileDir || '') + 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
            writeTestFile({fixture, fileName: (payload?.fileDir || '') + 'sub/s.tex'}, '\\documentclass[../main.tex]{subfiles}', '\\begin{document}', 'sub sub', '\\end{document}')
            break
        case 'subfileverbatim':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\input{sub/s}', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/s.tex'}, '\\section{Introduction}', 'This is a minimum \\LaTeX\\ document:', '\\begin{verbatim}', '\\documentclass{article}', '\\begin{document}', 'sub sub', '\\end{document}', '\\end{verbatim}')
            break
        case 'subfiletwomain':
            writeTestFile({fixture, fileName: (payload?.fileDir || '') + 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
            writeTestFile({fixture, fileName: (payload?.fileDir || '') + 'alt/main.tex'}, '\\documentclass{article}', '\\begin{document}', 'alt alt', '\\input{../sub/s}', '\\end{document}')
            writeTestFile({fixture, fileName: (payload?.fileDir || '') + 'sub/s.tex'}, 'sub sub')
            break
        case 'subfilethreelayer':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/s.tex'}, '\\documentclass[../main.tex]{subfiles}', '\\begin{document}', 'sub sub', '\\input{./subsub/infile}', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/subsub/infile.tex'}, 'subsub subsub')
            break
        case 'importthreelayer':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{import}', '\\begin{document}', 'main main', '\\subimport{sub}{s}', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/s.tex'}, '\\subimport{subsub/sss}{sss}')
            writeTestFile({fixture, fileName: 'sub/subsub/sss/sss.tex'}, 'sss sss')
            break
        case 'circularinclude':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\include{alt}', '\\end{document}')
            writeTestFile({fixture, fileName: 'alt.tex'}, '\\begin{texminted}', '\\include{alt}', '\\end{texminted}', '\\include{sub/s}')
            writeTestFile({fixture, fileName: 'sub/s.tex'}, 'sub sub')
            break
        case 'intellisense':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{glossaries}', '\\makeglossaries', '\\loadglsentries{sub/glossary}', '\\begin{document}', '\\gls{}', 'main main', '\\', '@', '#', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/glossary.tex'}, '\\newacronym{rf}{RF}{radio-frequency}', '\\newacronym{te}{TM}{Transverse Magnetic}', '\\newacronym{E_P}{E}{Elastic $\\varepsilon$ toto}','\\newacronym[argopt]{EPE_x}{E} % Badly formed entry',
                                                               '\\newglossaryentry{lw}{name={LaTeX Workshop}, description={What this extension is $\\mathbb{A}$}}', '\\newglossaryentry{vs_code}{name=VSCode, description=Editor}', '\\newabbr{abbr_x}{Ebbr}{A first abbreviation}', '\\newabbreviation[optional arg]{abbr_y}{Ybbr}{A second abbreviation}')
            break
        case 'structure':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{import}', '\\usepackage{hyperref}', '\\begin{document}', '\\input{sub/s}', '\\label{sec11}', '\\subsubsection{1.1.1}', '\\subsection{1.2}', '\\import{sub/}{s2.tex}', '\\subsubsection{2.0.1}', '\\subimport{sub/}{s3.tex}',
                                                       '\\section{4 A long title split', 'over two lines}', '\\section*{No \\textit{Number} Section}', '\\section{Section \\texorpdfstring{tex}{pdf} Caption}', '\\begin{figure}', '\\end{figure}', '\\begin{figure}', '\\caption{Figure Caption}', '\\end{figure}', '\\begin{table}', '\\caption{Table Caption}', '\\end{table}',
                                                       '\\begin{frame}', '\\frametitle{Frame Title 1}', '\\end{frame}', '\\begin{frame} {Frame Title 2}', '\\end{frame}', '\\begin{frame}', '\\end{frame}', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/s.tex'}, '\\section{1}\\label{sec1}', '\\subsection{1.1}', '\\altsection{1.1?}')
            writeTestFile({fixture, fileName: 'sub/s2.tex'}, '\\subsubsection{1.2.1}', '\\section{2}')
            writeTestFile({fixture, fileName: 'sub/s3.tex'}, '\\section{3}')
            break
        case 'linter':
            writeTestFile({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', '\\section{Section} \\label{section}', 'LaCheck~~Test', '\\input{sub/s}', '\\end{document}')
            writeTestFile({fixture, fileName: 'sub/s.tex'}, '\\section{Another Section} \\label{another}', 'LaCheck~~Sub')
            break
        default:
            break
    }
    await sleep(250)
}

export function getIntellisense(doc: vscode.TextDocument, pos: vscode.Position, extension: Extension, atSuggestion = false) {
    const completer = atSuggestion ? extension.atSuggestionCompleter : extension.completer
    return completer?.provideCompletionItems(
        doc, pos, new vscode.CancellationTokenSource().token, {
            triggerKind: vscode.CompletionTriggerKind.Invoke,
            triggerCharacter: undefined
        }
    )
}
