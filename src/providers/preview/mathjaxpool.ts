import {Extension} from '../../main'
import * as path from 'path'
import * as workerpool from 'workerpool'
import {Proxy} from 'workerpool'
import {IMathJaxWorker} from './mathjaxpool_worker'

type TypesetArg = {
    width?: number,
    equationNumbers?: string,
    math: string,
    format: string,
    svgNode: boolean,
    state?: any
}

export class MathJaxPool {
    extension: Extension
    pool: workerpool.WorkerPool
    proxy: workerpool.Promise<Proxy<IMathJaxWorker>>

    constructor(extension: Extension) {
        this.extension = extension
        this.pool = workerpool.pool(
            path.join(__dirname, 'mathjaxpool_worker.js'),
            { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
        )
        this.proxy = this.pool.proxy<IMathJaxWorker>()
    }

    async typeset(arg: TypesetArg, opts: { scale: number, color: string }): Promise<string> {
        try {
            return (await this.proxy).typeset(arg, opts).timeout(3000)
        } catch(e) {
            this.extension.logger.addLogMessage(`Error when MathJax is rendering ${arg.math}`)
            throw e
        }
    }

}
