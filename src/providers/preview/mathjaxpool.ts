import {Extension} from '../../main'
import * as path from 'path'
import * as workerpool from 'workerpool'

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
    constructor(extension: Extension) {
        this.extension = extension
        this.pool = workerpool.pool(
            path.join(__dirname, 'mathjaxpool_worker.js'),
            { minWorkers: 1, maxWorkers: 1, workerType: 'process' }
        )
    }

    async typeset(arg: TypesetArg, opts: { scale: number, color: string }): Promise<string> {
        return await this.pool.exec('typeset', [arg, opts]).timeout(3000)
    }

}
