import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as tmp from 'tmp'
import * as chokidar from 'chokidar'
import {latexParser} from 'latex-utensils'
import * as utils from '../utils/utils'
// import {InputFileRegExp} from '../utils/inputfilepath'

import type {Extension} from '../main'
import * as eventbus from './eventbus'

import {PdfWatcher} from './managerlib/pdfwatcher'
import {BibWatcher} from './managerlib/bibwatcher'
import {FinderUtils} from './managerlib/finderutils'
import {IntellisenseWatcher} from './managerlib/intellisensewatcher'

export const enum BuildEvents {
    never = 'never',
    onSave = 'onSave',
    onFileChange = 'onFileChange'
}

type RootFileType = {
    type: 'filePath',
    filePath: string
} | {
    type: 'uri',
    uri: vscode.Uri
}

export class Manager {
    private _localRootFile: string | undefined
    private _rootFileLanguageId: string | undefined
    private _rootFile: RootFileType | undefined
    readonly tmpDir: string

    private readonly extension: Extension
    private readonly pdfWatcher: PdfWatcher
    readonly bibWatcher: BibWatcher
    readonly intellisenseWatcher: IntellisenseWatcher
    private readonly finderUtils: FinderUtils
    private readonly rsweaveExt: string[] = ['.rnw', '.Rnw', '.rtex', '.Rtex', '.snw', '.Snw']
    private readonly jlweaveExt: string[] = ['.jnw', '.jtexw']

    constructor(extension: Extension) {
        this.extension = extension
        this.pdfWatcher = new PdfWatcher(extension)
        this.bibWatcher = new BibWatcher(extension)
        this.intellisenseWatcher = new IntellisenseWatcher()
        this.finderUtils = new FinderUtils(extension)
        this.registerSetEnvVar()

        this.extension.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('latex-workshop.latex.watch.usePolling') ||
                e.affectsConfiguration('latex-workshop.latex.watch.interval') ||
                e.affectsConfiguration('latex-workshop.latex.watch.delay') ||
                e.affectsConfiguration('latex-workshop.latex.watch.pdf.delay')) {
                // this.updateWatcherOptions(this.fileWatcher)
                this.bibWatcher.updateWatcherOptions()
                this.pdfWatcher.updateWatcherOptions()
            }
        }))

        // Create temp folder
        try {
            this.tmpDir = tmp.dirSync({unsafeCleanup: true}).name.split(path.sep).join('/')
        } catch (error) {
            void vscode.window.showErrorMessage('Error during making tmpdir to build TeX files. Please check the environment variables, TEMP, TMP, and TMPDIR on your system.')
            console.log(`TEMP, TMP, and TMPDIR: ${JSON.stringify([process.env.TEMP, process.env.TMP, process.env.TMPDIR])}`)
            // https://github.com/James-Yu/LaTeX-Workshop/issues/2911#issuecomment-944318278
            if (/['"]/.exec(os.tmpdir())) {
                const msg = `The path of tmpdir cannot include single quotes and double quotes: ${os.tmpdir()}`
                void vscode.window.showErrorMessage(msg)
                console.log(msg)
            }
            throw error
        }
    }

    updateWatcherOptions(watcher: chokidar.FSWatcher, pdf = false) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        watcher.options.usePolling = configuration.get('latex.watch.usePolling') as boolean
        watcher.options.interval = configuration.get('latex.watch.interval') as number
        watcher.options.awaitWriteFinish = {
            stabilityThreshold: pdf ? configuration.get('latex.watch.pdf.delay') : configuration.get('latex.watch.delay') as number
        }
    }

    async dispose() {
        await this.pdfWatcher.dispose()
        await this.bibWatcher.dispose()
    }
    /**
     * Returns the output directory developed according to the input tex path
     * and 'latex.outDir' config. If `texPath` is `undefined`, the default root
     * file is used. If there is not root file, returns './'.
     * The returned path always uses `/` even on Windows.
     *
     * @param texPath The path of a LaTeX file.
     */
    getOutDir(texPath?: string) {
        if (texPath === undefined) {
            texPath = this.rootFile
        }
        // rootFile is also undefined
        if (texPath === undefined) {
            return './'
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(texPath))
        const outDir = configuration.get('latex.outDir') as string
        const out = utils.replaceArgumentPlaceholders(texPath, this.tmpDir)(outDir)
        return path.normalize(out).split(path.sep).join('/')
    }

    /**
     * The path of the directory of the root file.
     */
    get rootDir() {
        return this.rootFile ? path.dirname(this.rootFile) : undefined
    }

    /**
     * The path of the root LaTeX file of the current workspace.
     * It is `undefined` before `findRoot` called.
     */
    get rootFile(): string | undefined {
        const ret = this._rootFile
        if (ret) {
            if (ret.type === 'filePath') {
                return ret.filePath
            } else {
                if (ret.uri.scheme === 'file') {
                    return ret.uri.fsPath
                } else {
                    this.extension.logger.addLogMessage(`The file cannot be used as the root file: ${ret.uri.toString(true)}`)
                    return
                }
            }
        } else {
            return
        }
    }

    set rootFile(root: string | undefined) {
        if (root) {
            this._rootFile = { type: 'filePath', filePath: root }
        } else {
            this._rootFile = undefined
        }
    }

    get rootFileUri(): vscode.Uri | undefined {
        const root = this._rootFile
        if (root) {
            if (root.type === 'filePath') {
                return vscode.Uri.file(root.filePath)
            } else {
                return root.uri
            }
        } else {
            return
        }
    }

    set rootFileUri(root: vscode.Uri | undefined) {
        let rootFile: RootFileType | undefined
        if (root) {
            if (root.scheme === 'file') {
                rootFile = { type: 'filePath', filePath: root.fsPath }
            } else {
                rootFile = { type: 'uri', uri: root }
            }
        }
        this._rootFile = rootFile
    }

    get localRootFile() {
        return this._localRootFile
    }

    set localRootFile(localRoot: string | undefined) {
        this._localRootFile = localRoot
    }

    get rootFileLanguageId() {
        return this._rootFileLanguageId
    }

    set rootFileLanguageId(id: string | undefined) {
        this._rootFileLanguageId = id
    }

    getWorkspaceFolderRootDir(): vscode.WorkspaceFolder | undefined {
        const rootFileUri = this.rootFileUri
        if (rootFileUri) {
            return vscode.workspace.getWorkspaceFolder(rootFileUri)
        }
        return undefined
    }

    private inferLanguageId(filename: string): string | undefined {
        const ext = path.extname(filename).toLocaleLowerCase()
        if (ext === '.tex') {
            return 'latex'
        } else if (this.jlweaveExt.includes(ext)) {
            return 'jlweave'
        } else if (this.rsweaveExt.includes(ext)) {
            return 'rsweave'
        } else if (ext === '.dtx') {
            return 'doctex'
        } else {
            return undefined
        }
    }

    /**
     * Returns the path of a PDF file with respect to `texPath`.
     *
     * @param texPath The path of a LaTeX file.
     * @param respectOutDir If `true`, the 'latex.outDir' config is respected.
     */
    tex2pdf(texPath: string, respectOutDir: boolean = true) {
        let outDir = './'
        if (respectOutDir) {
            outDir = this.getOutDir(texPath)
        }
        return path.resolve(path.dirname(texPath), outDir, path.basename(`${texPath.substring(0, texPath.lastIndexOf('.'))}.pdf`))
    }

    ignorePdfFile(rootFile: string) {
        const pdfFilePath = this.tex2pdf(rootFile)
        const pdfFileUri = vscode.Uri.file(pdfFilePath)
        this.pdfWatcher.ignorePdfFile(pdfFileUri)
    }

    /**
     * Returns `true` if the language of `id` is one of supported languages.
     *
     * @param id The language identifier
     */
    hasTexId(id: string) {
        return ['tex', 'latex', 'latex-expl3', 'doctex', 'jlweave', 'rsweave'].includes(id)
    }

    /**
     * Returns `true` if the language of `id` is bibtex
     *
     * @param id The language identifier
     */
    hasBibtexId(id: string) {
        return id === 'bibtex'
    }


    private findWorkspace(): vscode.Uri | undefined {
        const firstDir = vscode.workspace.workspaceFolders?.[0]
        // If no workspace is opened.
        if (!firstDir) {
            return undefined
        }
        // If we don't have an active text editor, we can only make a guess.
        // Let's guess the first one.
        if (!vscode.window.activeTextEditor) {
            return firstDir.uri
        }
        // Get the workspace folder which contains the active document.
        const activeFileUri = vscode.window.activeTextEditor.document.uri
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeFileUri)
        if (workspaceFolder) {
            return workspaceFolder.uri
        }
        // Guess that the first workspace is the chosen one.
        return firstDir.uri
    }

    /**
     * Finds the root file with respect to the current workspace and returns it.
     * The found root is also set to `rootFile`.
     */
    async findRoot(): Promise<string | undefined> {
        const wsfolders = vscode.workspace.workspaceFolders?.map(e => e.uri.toString(true))
        this.extension.logger.addLogMessage(`Current workspace folders: ${JSON.stringify(wsfolders)}`)
        this.localRootFile = undefined
        const findMethods = [
            () => this.finderUtils.findRootFromMagic(),
            () => this.findRootFromActive(),
            () => this.findRootFromCurrentRoot(),
            () => this.findRootInWorkspace()
        ]
        for (const method of findMethods) {
            const rootFile = await method()
            if (rootFile === undefined) {
                continue
            }
            if (this.rootFile !== rootFile) {
                this.extension.logger.addLogMessage(`Root file changed: from ${this.rootFile} to ${rootFile}`)
                this.extension.logger.addLogMessage('Start to find all dependencies.')
                this.rootFile = rootFile
                this.rootFileLanguageId = this.inferLanguageId(rootFile)
                this.extension.logger.addLogMessage(`Root file languageId: ${this.rootFileLanguageId}`)
                // We also clean the completions from the old project
                this.extension.completer.input.reset()
                this.extension.duplicateLabels.reset()
                await this.extension.cacher.resetWatcher()
                this.extension.cacher.add(this.rootFile)
                await this.extension.cacher.refreshContext(this.rootFile)
                // await this.initiateFileWatcher()
                // await this.parseFileAndSubs(this.rootFile, this.rootFile) // Finishing the parsing is required for subsequent refreshes.
                // We need to parse the fls to discover file dependencies when defined by TeX macro
                // It happens a lot with subfiles, https://tex.stackexchange.com/questions/289450/path-of-figures-in-different-directories-with-subfile-latex
                await this.extension.cacher.loadFlsFile(this.rootFile)
                this.extension.eventBus.fire(eventbus.RootFileChanged, rootFile)
            } else {
                this.extension.logger.addLogMessage(`Keep using the same root file: ${this.rootFile}`)
            }
            this.extension.eventBus.fire(eventbus.RootFileSearched)
            return rootFile
        }
        this.extension.eventBus.fire(eventbus.RootFileSearched)
        return undefined
    }

    private findRootFromCurrentRoot(): string | undefined {
        if (!vscode.window.activeTextEditor || this.rootFile === undefined) {
            return undefined
        }
        if (this.extension.lwfs.isVirtualUri(vscode.window.activeTextEditor.document.uri)) {
            this.extension.logger.addLogMessage(`The active document cannot be used as the root file: ${vscode.window.activeTextEditor.document.uri.toString(true)}`)
            return undefined
        }
        if (this.extension.cacher.getIncludedTeX().includes(vscode.window.activeTextEditor.document.fileName)) {
            return this.rootFile
        }
        return undefined
    }

    private findRootFromActive(): string | undefined {
        if (!vscode.window.activeTextEditor) {
            return undefined
        }
        if (this.extension.lwfs.isVirtualUri(vscode.window.activeTextEditor.document.uri)) {
            this.extension.logger.addLogMessage(`The active document cannot be used as the root file: ${vscode.window.activeTextEditor.document.uri.toString(true)}`)
            return undefined
        }
        const regex = /\\begin{document}/m
        const content = utils.stripCommentsAndVerbatim(vscode.window.activeTextEditor.document.getText())
        const result = content.match(regex)
        if (result) {
            const rootSubFile = this.finderUtils.findSubFiles(content)
            const file = vscode.window.activeTextEditor.document.fileName
            if (rootSubFile) {
               this.localRootFile = file
               return rootSubFile
            } else {
                this.extension.logger.addLogMessage(`Found root file from active editor: ${file}`)
                return file
            }
        }
        return undefined
    }

    private async findRootInWorkspace(): Promise<string | undefined> {
        const regex = /\\begin{document}/m
        const currentWorkspaceDirUri = this.findWorkspace()
        this.extension.logger.addLogMessage(`Current workspaceRootDir: ${currentWorkspaceDirUri ? currentWorkspaceDirUri.toString(true) : ''}`)

        if (!currentWorkspaceDirUri) {
            return undefined
        }

        const configuration = vscode.workspace.getConfiguration('latex-workshop', currentWorkspaceDirUri)
        const rootFilesIncludePatterns = configuration.get('latex.search.rootFiles.include') as string[]
        const rootFilesIncludeGlob = '{' + rootFilesIncludePatterns.join(',') + '}'
        const rootFilesExcludePatterns = configuration.get('latex.search.rootFiles.exclude') as string[]
        const rootFilesExcludeGlob = rootFilesExcludePatterns.length > 0 ? '{' + rootFilesExcludePatterns.join(',') + '}' : undefined
        try {
            const files = await vscode.workspace.findFiles(rootFilesIncludeGlob, rootFilesExcludeGlob)
            const candidates: string[] = []
            for (const file of files) {
                if (this.extension.lwfs.isVirtualUri(file)) {
                    this.extension.logger.addLogMessage(`Skip the file: ${file.toString(true)}`)
                    continue
                }
                const flsChildren = this.extension.cacher.getTeXChildrenFromFls(file.fsPath)
                if (vscode.window.activeTextEditor && flsChildren.includes(vscode.window.activeTextEditor.document.fileName)) {
                    this.extension.logger.addLogMessage(`Found root file from '.fls': ${file.fsPath}`)
                    return file.fsPath
                }
                const content = utils.stripCommentsAndVerbatim(fs.readFileSync(file.fsPath).toString())
                const result = content.match(regex)
                if (result) {
                    // Can be a root
                    const children = this.extension.cacher.getTeXChildren(file.fsPath, file.fsPath, [], content)
                    if (vscode.window.activeTextEditor && children.includes(vscode.window.activeTextEditor.document.fileName)) {
                        this.extension.logger.addLogMessage(`Found root file from parent: ${file.fsPath}`)
                        return file.fsPath
                    }
                    // Not including the active file, yet can still be a root candidate
                    candidates.push(file.fsPath)
                }
            }
            if (candidates.length > 0) {
                this.extension.logger.addLogMessage(`Found files that might be root, choose the first one: ${candidates}`)
                return candidates[0]
            }
        } catch (e) {}
        return undefined
    }

    onDidUpdateIntellisense(cb: (file: string) => void) {
        return this.intellisenseWatcher.onDidUpdateIntellisense(cb)
    }

    watchPdfFile(pdfFileUri: vscode.Uri) {
        this.pdfWatcher.watchPdfFile(pdfFileUri)
    }

    private autoBuild(file: string, bibChanged: boolean ) {
        if (!this.extension.builder.canAutoBuild()) {
            this.extension.logger.addLogMessage('Auto Build Run is temporarily disabled for `latex.autoBuild.interval`.')
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(file))
        if (!bibChanged && this.localRootFile && configuration.get('latex.rootFile.useSubFile')) {
            return this.extension.commander.build(true, this.localRootFile, this.rootFileLanguageId)
        } else {
            return this.extension.commander.build(true, this.rootFile, this.rootFileLanguageId)
        }
    }

    buildOnFileChanged(file: string, bibChanged: boolean = false) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(file))
        if (configuration.get('latex.autoBuild.run') as string !== BuildEvents.onFileChange) {
            return
        }
        this.extension.logger.addLogMessage(`Auto build started detecting the change of a file: ${file}`)
        return this.autoBuild(file, bibChanged)
    }

    buildOnSaveIfEnabled(file: string) {
        const configuration = vscode.workspace.getConfiguration('latex-workshop', vscode.Uri.file(file))
        if (configuration.get('latex.autoBuild.run') as string !== BuildEvents.onSave) {
            return
        }
        this.extension.logger.addLogMessage(`Auto build started on saving file: ${file}`)
        return this.autoBuild(file, false)
    }

    /**
     * Updates the Manager cache for packages used in `file` with `nodes`.
     * If `nodes` is `undefined`, `content` is parsed with regular expressions,
     * and the result is used to update the cache.
     *
     * @param file The path of a LaTeX file.
     * @param nodes AST of a LaTeX file.
     * @param content The content of a LaTeX file.
     */
    updateUsepackage(file: string, nodes?: latexParser.Node[], content?: string) {
        if (nodes !== undefined) {
            this.updateUsepackageNodes(file, nodes)
        } else if (content !== undefined) {
            const pkgReg = /\\usepackage(\[[^[\]{}]*\])?{(.*)}/gs

            while (true) {
                const result = pkgReg.exec(content)
                if (result === null) {
                    break
                }
                const packages = result[2].split(',').map(packageName => packageName.trim())
                const options = (result[1] || '[]').slice(1,-1).replaceAll(/\s*=\s*/g,'=').split(',').map(option => option.trim())
                const optionsNoTrue = options.filter(option => option.includes('=true')).map(option => option.replace('=true', ''))
                packages.forEach(packageName => this.pushUsepackage(file, packageName, [...options, ...optionsNoTrue]))
            }
        }
    }

    private updateUsepackageNodes(file: string, nodes: latexParser.Node[]) {
        nodes.forEach(node => {
            if ( latexParser.isCommand(node) && (node.name === 'usepackage' || node.name === 'documentclass') ) {
                let options: string[] = []
                node.args.forEach(arg => {
                    if (latexParser.isOptionalArg(arg)) {
                        options = arg.content.filter(latexParser.isTextString).filter(str => str.content !== ',').map(str => str.content)
                        const optionsNoTrue = options.filter(option => option.includes('=true')).map(option => option.replace('=true', ''))
                        options = [...options, ...optionsNoTrue]
                        return
                    }
                    for (const c of arg.content) {
                        if (!latexParser.isTextString(c)) {
                            continue
                        }
                        c.content.split(',').forEach(packageName => this.pushUsepackage(file, packageName, options, node))
                    }
                })
            } else {
                if (latexParser.hasContentArray(node)) {
                    this.updateUsepackageNodes(file, node.content)
                }
            }
        })
    }

    private pushUsepackage(fileName: string, packageName: string, options: string[], node?: latexParser.Command) {
        packageName = packageName.trim()
        if (packageName === '') {
            return
        }
        if (node?.name === 'documentclass') {
            packageName = 'class-' + packageName
        }
        const cache = this.extension.cacher.getCachedContent(fileName)
        if (cache === undefined) {
            return
        }
        cache.elements.package = cache.elements.package || {}
        cache.elements.package[packageName] = options
    }

    private registerSetEnvVar() {
        this.setEnvVar()
        const configName = 'latex-workshop.docker.image.latex'
        vscode.workspace.onDidChangeConfiguration((ev) => {
            if (ev.affectsConfiguration(configName)) {
                this.setEnvVar()
            }
        })
    }

    private setEnvVar() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const dockerImageName: string = configuration.get('docker.image.latex', '')
        this.extension.logger.addLogMessage(`Set $LATEXWORKSHOP_DOCKER_LATEX: ${JSON.stringify(dockerImageName)}`)
        process.env['LATEXWORKSHOP_DOCKER_LATEX'] = dockerImageName
    }

}
