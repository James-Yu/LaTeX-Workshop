import * as vscode from 'vscode'
import * as path from 'path'
import * as workerpool from 'workerpool'
import type { SupportedExtension } from 'mathjax-full'
import type { IMathJaxWorker } from './mathjax/mathjax'
import { lw } from '../lw'

export const mathjax = {
    typeset
}

const pool: workerpool.Pool = workerpool.pool(
    path.join(__dirname, 'mathjax', 'mathjax.js'),
    { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
)
const proxy = pool.proxy<IMathJaxWorker>()

lw.onConfigChange('hover.preview.mathjax.extensions', initialize)
lw.onDispose({ dispose: async () => { await pool.terminate(true) } })

void initialize()
async function initialize() {
    const extensions = vscode.workspace.getConfiguration('latex-workshop').get('hover.preview.mathjax.extensions', []) as SupportedExtension[]
    const extensionsToLoad = extensions.filter((ex) => lw.constant.MATHJAX_EXT.includes(ex))
    void (await proxy).loadExtensions(extensionsToLoad)
}

async function typeset(arg: string, opts: { scale: number, color: string }): Promise<string> {
    return (await proxy).typeset(arg, opts).timeout(3000)
}
