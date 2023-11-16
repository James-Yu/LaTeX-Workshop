import * as vscode from 'vscode'
import * as path from 'path'
import * as workerpool from 'workerpool'
import type { Proxy } from 'workerpool'
import type { IMathJaxWorker } from './mathjaxpool_worker'
import type { SupportedExtension } from 'mathjax-full'

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
    private static readonly pool: workerpool.WorkerPool = workerpool.pool(
        path.join(__dirname, 'mathjaxpool_worker.js'),
        { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
    )
    private static readonly proxyPromise: workerpool.Promise<Proxy<IMathJaxWorker>> = MathJaxPool.pool.proxy<IMathJaxWorker>()

    static dispose() {
        return {
            dispose: async () => { await MathJaxPool.pool.terminate(true) }
        }
    }

    static initialize() {
        void MathJaxPool.loadExtensions()
        vscode.workspace.onDidChangeConfiguration(async (ev) => {
            if (ev.affectsConfiguration('latex-workshop.hover.preview.mathjax.extensions')) {
                return this.loadExtensions()
            }
        })
    }

    static async typeset(arg: string, opts: { scale: number, color: string }): Promise<string> {
        const proxy = await this.proxyPromise
        const svgHtml = await proxy.typeset(arg, opts).timeout(3000)
        return svgHtml
    }

    private static async loadExtensions() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const extensions = configuration.get('hover.preview.mathjax.extensions', []) as SupportedExtension[]
        const extensionsToLoad = extensions.filter((ex) => supportedExtensionList.includes(ex))
        const proxy = await this.proxyPromise
        return proxy.loadExtensions(extensionsToLoad)
    }

}
