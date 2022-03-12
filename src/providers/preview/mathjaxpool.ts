import * as vscode from 'vscode'
import * as path from 'path'
import * as workerpool from 'workerpool'
import type {Proxy} from 'workerpool'
import type {IMathJaxWorker} from './mathjaxpool_worker'
import type {SupportedExtension} from 'mathjax-full'

const supportedExtensionList = [
    'amscd',
    'bbox',
    'boldsymbol',
    'braket',
    'bussproofs',
    'cancel',
    'cases',
    'centernot',
    'colortbl',
    'empheq',
    'enclose',
    'extpfeil',
    'gensymb',
    'html',
    'mathtools',
    'mhchem',
    'physics',
    'textcomp',
    'textmacros',
    'unicode',
    'upgreek',
    'verb'
]

export class MathJaxPool {
    private readonly pool: workerpool.WorkerPool
    private readonly proxyPromise: workerpool.Promise<Proxy<IMathJaxWorker>>

    constructor() {
        this.pool = workerpool.pool(
            path.join(__dirname, 'mathjaxpool_worker.js'),
            { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
        )
        this.proxyPromise = this.pool.proxy<IMathJaxWorker>()
        void this.initializeExtensions()
    }

    async dispose() {
        await this.pool.terminate()
    }

    private initializeExtensions() {
        void this.loadExtensions()
        vscode.workspace.onDidChangeConfiguration(async (ev) => {
            if (ev.affectsConfiguration('latex-workshop.hover.preview.mathjax.extensions')) {
                return this.loadExtensions()
            }
        })
    }

    async typeset(arg: string, opts: { scale: number, color: string }): Promise<string> {
        const proxy = await this.proxyPromise
        const svgHtml = await proxy.typeset(arg, opts).timeout(3000)
        return svgHtml
    }

    private async loadExtensions() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const extensions = configuration.get('hover.preview.mathjax.extensions', []) as SupportedExtension[]
        const extensionsToLoad = extensions.filter((ex) => supportedExtensionList.includes(ex))
        const proxy = await this.proxyPromise
        return proxy.loadExtensions(extensionsToLoad)
    }

}
