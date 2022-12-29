import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import * as os from 'os'
import * as assert from 'assert'
import { Extension } from '../../src/main'

type RunTestOption = {
    suiteName: string,
    fixtureName: string,
    testName: string,
    timeout?: number,
    only?: boolean,
    win32only?: boolean
}

export function runTest(option: RunTestOption, cb: (fixture: string) => unknown) {
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
    if (process.env['LATEXWORKSHOP_CISUITE'] && !process.env['LATEXWORKSHOP_CISUITE'].split(',').includes(option.suiteName)) {
        return
    }
    if (option.win32only && os.platform() !== 'win32') {
        return
    }

    const testFunction = option.only ? test.only : test

    testFunction(`${option.suiteName}: ${option.testName}`, async () => {
        try {
            await cb(fixture || '.')
        } catch (error) {
            await log()
            throw error
        }
    }).timeout(option.timeout || 60000)
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function log() {
    await vscode.commands.executeCommand('workbench.action.output.toggleOutput')
    await sleep(250)
    await vscode.commands.executeCommand('latex-workshop.log')
    await sleep(250)
    const logMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(logMessage)
    await vscode.commands.executeCommand('latex-workshop.compilerlog')
    await sleep(250)
    const compilerLogMessage = vscode.window.activeTextEditor?.document.getText()
    console.log(compilerLogMessage)
}

type WriteTestOption = {
    fixture: string,
    fileName: string
}

export function writeTest(option: WriteTestOption, ...contents: string[]) {
    fs.mkdirSync(path.resolve(option.fixture, path.dirname(option.fileName)), {recursive: true})
    fs.writeFileSync(path.resolve(option.fixture, option.fileName), contents.join('\n'))
}

type AssertBuildOption = {
    fixture: string,
    texFileName: string,
    pdfFileName: string,
    extension?: Extension,
    build?: () => unknown,
    nobuild?: boolean
}

export async function assertBuild(option: AssertBuildOption) {
    const texFilePath = vscode.Uri.file(path.join(option.fixture, option.texFileName))
    const pdfFilePath = path.join(option.fixture, option.pdfFileName)
    const doc = await vscode.workspace.openTextDocument(texFilePath)
    await vscode.window.showTextDocument(doc)
    await option.extension?.manager.findRoot()
    if (option.build) {
        await option.build()
    } else {
        await vscode.commands.executeCommand('latex-workshop.build')
    }

    const files = glob.sync('**/**.pdf', { cwd: option.fixture })
    assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), option.pdfFileName === '' ? option.pdfFileName : pdfFilePath)
}

export async function assertAutoBuild(option: AssertBuildOption, mode?: 'skipFirstBuild' | 'noAutoBuild' | 'onSave') {
    if (mode !== 'skipFirstBuild' && mode !== 'noAutoBuild') {
        await assertBuild(option)
    }
    fs.rmSync(path.resolve(option.fixture, option.pdfFileName))

    let files = glob.sync('**/**.pdf', { cwd: option.fixture })
    assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), '')
    await sleep(250)

    const wait = waitBuild(option.extension)
    if (mode !== 'onSave') {
        fs.appendFileSync(path.resolve(option.fixture, option.texFileName), ' % edit')
    } else {
        await vscode.commands.executeCommand('workbench.action.files.save')
    }

    if (mode !== 'noAutoBuild') {
        await wait
        files = glob.sync('**/**.pdf', { cwd: option.fixture })
        assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), path.resolve(option.fixture, option.pdfFileName))
    } else {
        await sleep(3000)
        files = glob.sync('**/**.pdf', { cwd: option.fixture })
        assert.strictEqual(files.map(file => path.resolve(option.fixture, file)).join(','), '')
    }
}

export async function waitBuild(extension?: Extension) {
    return new Promise<void>((resolve, _) => {
        const disposable = extension?.eventBus.on('buildfinished', () => {
            resolve()
            disposable?.dispose()
        })
    })
}

type WriteTeXType = 'main' | 'makeindex' | 'makesubfileindex' | 'magicprogram' | 'magicoption' | 'magicroot' | 'magicinvalidprogram' |
    'subfile' | 'subfileverbatim' | 'subfiletwomain' | 'subfilethreelayer' | 'importthreelayer' | 'bibtex' |
    'input' | 'inputmacro' | 'inputfromfolder' | 'circularinclude' | 'intellisense' | 'structure' | 'linter'

export async function writeTeX(type: WriteTeXType, fixture: string, payload?: {fileName?: string}) {
    switch (type) {
        case 'main':
            writeTest({fixture, fileName: payload?.fileName || 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
            break
        case 'makeindex':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{makeidx}', '\\makeindex', '\\begin{document}', 'abc\\index{abc}', '\\printindex', '\\end{document}')
            break
        case 'makesubfileindex':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, '\\documentclass[../main.tex]{subfiles}', '\\usepackage{makeidx}', '\\makeindex', '\\begin{document}', 'abc\\index{abc}', '\\printindex', '\\end{document}')
            break
        case 'magicprogram':
            writeTest({fixture, fileName: 'main.tex'}, '% !TEX program = pdflatex', '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
            break
        case 'magicoption':
            writeTest({fixture, fileName: 'main.tex'}, '% !TEX program = latexmk', '% !TEX options = -synctex=1 -interaction=nonstopmode -file-line-error -pdf -outdir="./out/" "%DOC%"', '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
            break
        case 'magicroot':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\input{sub/s}', '\\end{document}')
            writeTest({fixture, fileName: 'alt.tex'}, '\\documentclass{article}', '\\begin{document}', 'alt alt', '\\input{sub/s}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, '% !TEX root = ../main.tex', 'sub sub')
            break
        case 'magicinvalidprogram':
            writeTest({fixture, fileName: 'main.tex'}, '% !TEX program = noexistprogram', '\\documentclass{article}', '\\begin{document}', 'abc', '\\end{document}')
            break
        case 'input':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\input{sub/s}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, 'sub sub')
            break
        case 'inputmacro':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\providecommand{\\main}{sub}', '\\begin{document}', 'main main', '\\input{\\main/s}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, 'sub sub')
            break
        case 'inputfromfolder':
            writeTest({fixture, fileName: 'main/main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\input{../sub/s}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, 'sub sub')
            break
        case 'bibtex':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\bibliographystyle{plain}', '\\bibliography{bib}', '\\end{document}')
            writeTest({fixture, fileName: 'bib.bib'}, '%')
            break
        case 'subfile':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, '\\documentclass[../main.tex]{subfiles}', '\\begin{document}', 'sub sub', '\\end{document}')
            break
        case 'subfileverbatim':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\input{sub/s}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, '\\section{Introduction}', 'This is a minimum \\LaTeX\\ document:', '\\begin{verbatim}', '\\documentclass{article}', '\\begin{document}', 'sub sub', '\\end{document}', '\\end{verbatim}')
            break
        case 'subfiletwomain':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
            writeTest({fixture, fileName: 'alt/main.tex'}, '\\documentclass{article}', '\\begin{document}', 'alt alt', '\\input{../sub/s}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, 'sub sub')
            break
        case 'subfilethreelayer':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{subfiles}', '\\begin{document}', 'main main', '\\subfile{sub/s}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, '\\documentclass[../main.tex]{subfiles}', '\\begin{document}', 'sub sub', '\\input{./subsub/infile}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/subsub/infile.tex'}, 'subsub subsub')
            break
        case 'importthreelayer':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{import}', '\\begin{document}', 'main main', '\\subimport{sub}{s}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, '\\subimport{subsub/sss}{sss}')
            writeTest({fixture, fileName: 'sub/subsub/sss/sss.tex'}, 'sss sss')
            break
        case 'circularinclude':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', 'main main', '\\include{alt}', '\\end{document}')
            writeTest({fixture, fileName: 'alt.tex'}, '\\begin{texminted}', '\\include{alt}', '\\end{texminted}', '\\include{sub/s}')
            writeTest({fixture, fileName: 'sub/s.tex'}, 'sub sub')
            break
        case 'intellisense':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{glossaries}', '\\makeglossaries', '\\loadglsentries{sub/glossary}', '\\begin{document}', '\\gls{}', 'main main', '\\', '@', '#', '\\end{document}')
            writeTest({fixture, fileName: 'sub/glossary.tex'}, '\\newacronym{rf}{RF}{radio-frequency}', '\\newacronym{te}{TM}{Transverse Magnetic}', '\\newacronym{E_P}{E}{Elastic $\\varepsilon$ toto}','\\newacronym[argopt]{EPE_x}{E} % Badly formed entry',
                                                               '\\newglossaryentry{lw}{name={LaTeX Workshop}, description={What this extension is $\\mathbb{A}$}}', '\\newglossaryentry{vs_code}{name=VSCode, description=Editor}', '\\newabbr{abbr_x}{Ebbr}{A first abbreviation}', '\\newabbreviation[optional arg]{abbr_y}{Ybbr}{A second abbreviation}')
            break
        case 'structure':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\usepackage{import}', '\\usepackage{hyperref}', '\\begin{document}', '\\input{sub/s}', '\\label{sec11}', '\\subsubsection{1.1.1}', '\\subsection{1.2}', '\\import{sub/}{s2.tex}', '\\subsubsection{2.0.1}', '\\subimport{sub/}{s3.tex}',
                                                       '\\section{4 A long title split', 'over two lines}', '\\section*{No \\textit{Number} Section}', '\\section{Section \\texorpdfstring{tex}{pdf} Caption}', '\\begin{figure}', '\\end{figure}', '\\begin{figure}', '\\caption{Figure Caption}', '\\end{figure}', '\\begin{table}', '\\caption{Table Caption}', '\\end{table}',
                                                       '\\begin{frame}', '\\frametitle{Frame Title 1}', '\\end{frame}', '\\begin{frame} {Frame Title 2}', '\\end{frame}', '\\begin{frame}', '\\end{frame}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, '\\section{1}\\label{sec1}', '\\subsection{1.1}', '\\altsection{1.1?}')
            writeTest({fixture, fileName: 'sub/s2.tex'}, '\\subsubsection{1.2.1}', '\\section{2}')
            writeTest({fixture, fileName: 'sub/s3.tex'}, '\\section{3}')
            break
        case 'linter':
            writeTest({fixture, fileName: 'main.tex'}, '\\documentclass{article}', '\\begin{document}', '\\section{Section} \\label{section}', 'LaCheck~~Test', '\\input{sub/s}', '\\end{document}')
            writeTest({fixture, fileName: 'sub/s.tex'}, '\\section{Another Section} \\label{another}', 'LaCheck~~Sub')
            break
        default:
            break
    }
    await sleep(250)
}
