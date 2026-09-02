import path from 'path'
import * as vscode from 'vscode'
import { lw } from '../lw'
import { pickRootPath } from '../utils/quick-pick'
import { Plan } from './plan'
import { Recipe } from './recipe'
import type { PlanResult } from './types'

const logger = lw.log('Build', 'Executor')

export class Executor {
    private _activePlan?: Plan
    private _backend = 'unknown'
    private _compiledPDFPath = ''
    private _compiledPDFWriting = 0

    private pendingPlan?: {plan: Plan, requestId: number, generation: number}
    private readonly pendingPreparation = new Map<number, {
        generation: number,
        promise: Promise<Plan | undefined>
    }>()
    private running = false
    private generation = 0
    private nextRequestId = 0
    private initialized = false

    get activePlan(): Plan | undefined {
        return this._activePlan
    }

    // l3backend expected: pdftex | luatex | xetex | dvips | dvipdfmx | dvisvgm
    get backend(): string {
        return this._backend
    }

    get compiledPDFPath(): string {
        return this._compiledPDFPath
    }

    get compiledPDFWriting(): number {
        return this._compiledPDFWriting
    }

    initialize() {
        if (this.initialized) {
            return
        }
        this.initialized = true
        this.setDockerImage()
        this.setDockerPath()
        lw.onConfigChange('docker.image.latex', () => this.setDockerImage())
        lw.onConfigChange('docker.path', () => this.setDockerPath())
    }

    /**
     * Prepares and queues a build request in request order.
     * The first caller owns draining; only successful current-generation plans
     * become pending, while later callers enqueue and repair an idle handoff.
     */
    async run(request: {
        recipeName?: string,
        isAuto: boolean,
        isBibChanged: boolean
    }): Promise<void> {
        const requestId = ++this.nextRequestId
        const requestGeneration = this.generation
        const ownsDrain = !this.running
        if (ownsDrain) {
            this.running = true
        }

        const promise = this.preparePlan(request)
        this.pendingPreparation.set(requestId, {generation: requestGeneration, promise})

        try {
            const plan = await promise
            if (plan && requestGeneration === this.generation) {
                // A successful newer request wins. Failed or invalid requests never
                // discard an older successful candidate, even if it is still preparing.
                if (!this.pendingPlan || requestId > this.pendingPlan.requestId) {
                    this.pendingPlan = {plan, requestId, generation: requestGeneration}
                }
            }
        } catch (error) {
            if (ownsDrain) {
                this.handoffDrain()
            }
            throw error
        } finally {
            this.pendingPreparation.delete(requestId)
        }

        if (!ownsDrain) {
            // A drain may have moved to its final idle transition while this
            // request was preparing. Claim ownership if that handoff window won.
            this.startDetachedDrain()
            return
        }
        await this.drain()
    }

    terminate(): Error | undefined {
        // Advancing the generation invalidates work requested before terminate;
        // requests started afterwards remain eligible while the active Step exits.
        this.generation++
        this.pendingPlan = undefined
        return this._activePlan?.terminate()
    }

    private setDockerImage() {
        const image = vscode.workspace.getConfiguration('latex-workshop').get('docker.image.latex', '')
        logger.log(`Set $LATEXWORKSHOP_DOCKER_LATEX: ${JSON.stringify(image)}`)
        process.env['LATEXWORKSHOP_DOCKER_LATEX'] = image
    }

    private setDockerPath() {
        const dockerPath = vscode.workspace.getConfiguration('latex-workshop').get('docker.path', '')
        logger.log(`Set $LATEXWORKSHOP_DOCKER_PATH: ${JSON.stringify(dockerPath)}`)
        process.env['LATEXWORKSHOP_DOCKER_PATH'] = dockerPath
    }

    /**
     * Resolves the editor target, saves documents, and creates a Plan.
     * External builds take priority but cannot overlap; internal builds require
     * a valid root/language and may prompt for a manual root or be cancelled.
     */
    private async preparePlan(request: {
        recipeName?: string,
        isAuto: boolean,
        isBibChanged: boolean
    }): Promise<Plan | undefined> {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor) {
            logger.log('Cannot start to build because the active editor is undefined.')
            return
        }

        logger.log(`The document of the active editor: ${activeEditor.document.uri.toString(true)}`)
        logger.log(`The languageId of the document: ${activeEditor.document.languageId}`)
        const target = await this.findBuildTarget(request, activeEditor)
        const fallbackCwd = path.dirname(activeEditor.document.fileName)
        const external = Recipe.createExternal(activeEditor.document.uri, fallbackCwd, target.rootFile)
        if (external) {
            if (this._activePlan) {
                void logger.showErrorMessageWithCompilerLogButton('Please wait for the current build to finish.')
                return
            }
            await vscode.workspace.saveAll()
            return Plan.create(external)
        }

        if (target.rootFile === undefined || target.languageId === undefined) {
            logger.log('Cannot find LaTeX root file. See https://github.com/James-Yu/LaTeX-Workshop/wiki/Compile#the-root-file')
            return
        }
        let rootFile = target.rootFile
        const languageId = target.languageId
        if (!request.isAuto && lw.root.subfiles.path) {
            const pickedRootFile = await pickRootPath(rootFile, lw.root.subfiles.path, 'compile')
            if (!pickedRootFile) {
                return
            }
            rootFile = pickedRootFile
        }

        logger.log(`Building root file: ${rootFile}`)
        await vscode.workspace.saveAll()
        const recipe = await Recipe.create(rootFile, languageId, request.recipeName)
        return recipe && Plan.create(recipe)
    }

    /**
     * Selects the root and language for an automatic or manual build.
     * Auto builds reuse known state and may choose a subfile unless Bib changed;
     * manual builds reject non-LaTeX editors and run root discovery.
     */
    private async findBuildTarget(
        request: {isAuto: boolean, isBibChanged: boolean},
        activeEditor: vscode.TextEditor
    ): Promise<{rootFile?: string, languageId?: string}> {
        if (request.isAuto) {
            let rootFile = lw.root.file.path
            let languageId = lw.root.file.langId
            const scope = rootFile ? lw.file.toUri(rootFile) : activeEditor.document.uri
            const configuration = vscode.workspace.getConfiguration('latex-workshop', scope)
            if (!request.isBibChanged && lw.root.subfiles.path && configuration.get('latex.rootFile.useSubFile')) {
                rootFile = lw.root.subfiles.path
                languageId = lw.root.subfiles.langId
            }
            return {rootFile, languageId}
        }

        if (!lw.file.hasLaTeXLangId(activeEditor.document.languageId)) {
            return {}
        }
        await lw.root.find()
        const rootFile = lw.root.file.path
        const languageId = lw.root.file.langId

        return {rootFile, languageId}
    }

    /**
     * Runs eligible pending Plans serially, preferring the latest request.
     * It waits for relevant preparations before switching or idling, advances
     * generations on failure, and always restores counters and drain ownership.
     */
    private async drain(): Promise<void> {
        let started = false
        try {
            while (true) {
                if (started || !this.pendingPlan) {
                    // Before switching or going idle, wait for every request that
                    // can still produce the highest request-order candidate.
                    await this.waitForPendingPreparation()
                }
                const pending = this.takePendingPlan()
                if (!pending) {
                    return
                }
                if (!started) {
                    started = true
                    // Stop watching the PDF file to avoid reloading the PDF viewer twice.
                    // The builder will be responsible for refreshing the viewer.
                    this._compiledPDFWriting++
                    lw.parser.parse.clearLog()
                }

                this._activePlan = pending.plan
                await this.prepareExecution(pending.plan)
                const result = await pending.plan.run()
                this._backend = result.backend
                if (result.status === 'succeeded') {
                    await this.afterSuccessfulBuild(pending.plan, result)
                    this._activePlan = undefined
                    continue
                }

                // Failure owns a new generation. If terminate already advanced it,
                // preserve work explicitly requested after termination.
                if (this.generation === pending.generation) {
                    this.generation++
                    this.pendingPlan = undefined
                }
                await this.handleFailedPlan(pending.plan, result)
                this._activePlan = undefined
            }
        } finally {
            this._activePlan = undefined
            this.running = false
            if (started) {
                const delay = vscode.workspace.getConfiguration('latex-workshop')
                    .get('latex.watch.pdf.delay', 100) * 2
                setTimeout(() => this._compiledPDFWriting--, delay)
            }
            this.startDetachedDrain()
        }
    }

    private async waitForPendingPreparation() {
        while (true) {
            const promises = [...this.pendingPreparation.values()]
                .filter(preparation => preparation.generation === this.generation)
                .map(preparation => preparation.promise)
            if (promises.length === 0) {
                return
            }
            await Promise.allSettled(promises)
        }
    }

    private takePendingPlan(): {plan: Plan, requestId: number, generation: number} | undefined {
        if (this.pendingPlan?.generation !== this.generation) {
            this.pendingPlan = undefined
            return
        }
        const pending = this.pendingPlan
        this.pendingPlan = undefined
        return pending
    }

    private handoffDrain() {
        // The original owner must reject its own error, so a detached drainer
        // takes responsibility for any independent Plan that remains eligible.
        this.running = false
        this.startDetachedDrain()
    }

    private startDetachedDrain() {
        if (this.running || (!this.pendingPlan && !this.hasCurrentPreparation())) {
            return
        }
        this.running = true
        void this.drain().catch(error => {
            logger.logError('Unexpected error while continuing a pending build.', error)
        })
    }

    private hasCurrentPreparation(): boolean {
        return [...this.pendingPreparation.values()]
            .some(preparation => preparation.generation === this.generation)
    }

    private async prepareExecution(plan: Plan) {
        if (plan.rootFile && !plan.isExternal) {
            const auxRoot = plan.steps.some(step => step.command === 'latexmk')
                && plan.rootFile === lw.root.subfiles.path
                && lw.root.file.path
                ? lw.root.file.path
                : plan.rootFile
            await this.createAuxSubFolders(auxRoot)
        }

        // #4513 If the recipe contains a forced latexmk compilation, don't set the
        // compiledPDFPath so that PDF refresh is handled by file watcher.
        const forcedLatexmk = !plan.isExternal && plan.steps.some(step => step.command === 'latexmk'
            && step.args?.includes('-interaction=nonstopmode')
            && step.args.includes('-f'))
        if (!forcedLatexmk) {
            this._compiledPDFPath = plan.rootFile ? lw.file.getPdfPath(plan.rootFile) : ''
        }
    }

    private async createAuxSubFolders(rootFile: string) {
        const rootDir = path.dirname(rootFile)
        let auxDir = lw.file.getAuxDir(rootFile)
        if (!path.isAbsolute(auxDir)) {
            auxDir = path.resolve(rootDir, auxDir)
        }
        logger.log(`RootFile auxDir: ${auxDir} .`)
        for (const file of lw.cache.getIncludedTeX(rootFile)) {
            const relativePath = path.dirname(file.replace(rootDir, '.'))
            const fullAuxDir = path.resolve(auxDir, relativePath)
            // To avoid issues when fullAuxDir is the root dir. Using fs.mkdir()
            // on the root directory even with recursion will result in an error
            try {
                const fileStat = await lw.file.exists(fullAuxDir)
                if (!fileStat || ![
                    vscode.FileType.Directory,
                    vscode.FileType.Directory | vscode.FileType.SymbolicLink
                ].includes(fileStat.type)) {
                    logger.log(`Create auxDir: ${fullAuxDir} .`)
                    lw.external.mkdirSync(fullAuxDir, {recursive: true})
                }
            } catch (error) {
                if (error instanceof Error) {
                    // #4048
                    logger.log(`Unexpected Error: ${error.name}: ${error.message} .`)
                } else {
                    logger.log('Unexpected Error: please see the console log of the Developer Tools of VS Code.')
                    logger.refreshStatus('x', 'errorForeground')
                    throw error
                }
            }
        }
    }

    /**
     * Reports a failed Plan according to its result and origin.
     * Termination only resets status, process errors were already reported,
     * external failures get their own message, and internal failures may clean.
     */
    private async handleFailedPlan(plan: Plan, result: PlanResult) {
        if (result.status === 'terminated') {
            logger.refreshStatus('x', 'errorForeground')
            return
        }
        if (result.result.error) {
            return
        }
        const pid = result.step.process?.pid
        if (plan.isExternal) {
            logger.log(`Build with external command returns error on PID ${pid}.`)
            logger.refreshStatus('x', 'errorForeground', undefined, 'warning')
            void logger.showErrorMessageWithCompilerLogButton('Build terminated with error.')
            return
        }

        logger.refreshStatus('x', 'errorForeground')
        const configuration = vscode.workspace.getConfiguration(
            'latex-workshop',
            plan.rootFile ? lw.file.toUri(plan.rootFile) : undefined
        )
        if (['onFailed', 'onBuilt'].includes(configuration.get('latex.autoClean.run', 'never'))) {
            try {
                await lw.extra.clean(plan.rootFile)
            } catch (error) {
                logger.logError('Failed to clean auxiliary files after build failure.', error)
            }
        }
        // MiKTeX ships latexmk (and other Perl-based tools) as wrappers that need
        // an external Perl, which Windows does not provide out of the box. The
        // resulting failure is a setup problem, not a document problem, so point
        // at the remedy instead of the generic message. Only the Perl diagnostic
        // is matched: MiKTeX uses the same wording for other missing script
        // engines (e.g. Python), whose remedy is different.
        const output = result.result.stdout + result.result.stderr
        if (output.includes('MiKTeX could not find the script engine \'perl\'')) {
            void logger.showErrorMessageWithCompilerLogButton(`Recipe terminated with error: MiKTeX could not run "${result.step.command}" because it needs a Perl installation, and none was found. Install Perl (e.g. Strawberry Perl), then quit and relaunch VS Code so it picks up the new PATH (reloading the window is not enough) — or switch to a recipe that does not need Perl, such as "pdflatex ➞ bibtex ➞ pdflatex × 2".`)
            return
        }
        void logger.showErrorMessageWithCompilerLogButton('Recipe terminated with error.')
    }

    /**
     * Publishes success and refreshes artifacts for a completed Plan.
     * Rootless external builds only refresh; skipped internal builds stop after
     * BuildDone, while other builds update PDF data, SyncTeX, and optional clean.
     */
    private async afterSuccessfulBuild(plan: Plan, result: PlanResult) {
        // This only happens when the step is an external command.
        if (plan.rootFile === undefined) {
            lw.viewer.refresh()
            return
        }
        logger.log(`Successfully built ${plan.rootFile} .`)
        logger.refreshStatus('check', 'statusBar.foreground', 'Recipe succeeded.')
        lw.event.fire(lw.event.BuildDone)
        if (!plan.isExternal && result.skipped) {
            return
        }

        const pdfUri = lw.file.toUri(lw.file.getPdfPath(plan.rootFile))
        lw.viewer.refresh(pdfUri)
        lw.completion.reference.setNumbersFromAuxFile(plan.rootFile)
        await lw.cache.loadFlsFile(plan.rootFile)
        const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.file.toUri(plan.rootFile))
        // If the PDF viewer is internal, we call SyncTeX in src/components/viewer.ts.
        if (configuration.get('view.pdf.viewer') === 'external' && configuration.get('synctex.afterBuild.enabled')) {
            logger.log('SyncTex after build invoked.')
            lw.locate.synctex.toPDF(pdfUri)
        }
        if (['onSucceeded', 'onBuilt'].includes(configuration.get('latex.autoClean.run', 'never'))) {
            logger.log('Auto Clean invoked.')
            await lw.extra.clean(plan.rootFile)
        }
    }
}

export const executor = new Executor()
