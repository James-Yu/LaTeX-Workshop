import * as path from 'path'
import Mocha from 'mocha'
import { glob } from 'glob'
import { hooks } from './utils'

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'bdd',
        color: true,
        timeout: process.env['LATEXWORKSHOP_CITEST'] ? 10000 : 8000,
        retries: process.env['LATEXWORKSHOP_CITEST'] ? 8 : 2
    })

    mocha.suite.on('pre-require', (context) => {
        context.describe.only = process.env['LATEXWORKSHOP_CITEST'] ? context.describe : context.describe.only
        context.it.only = process.env['LATEXWORKSHOP_CITEST'] ? context.it : context.it.only
    })

    mocha.rootHooks(hooks)

    ;(globalThis as any).mocha = mocha

    return new Promise((resolve, reject) => {
        glob.sync('**/**.test.js', { cwd: __dirname })
            .filter(f => process.env['LATEXWORKSHOP_UNIT'] ? process.env['LATEXWORKSHOP_UNIT'].split(',').find(candidate => f.includes(candidate)) !== undefined : true)
            .sort()
            .forEach(f => mocha.addFile(path.resolve(__dirname, f)))
        // Run the mocha test
        import('../../src/main').then(() => {
            mocha.run(failures => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`))
                } else {
                    resolve()
                }
            })
        }).catch(error => {
            console.error(error)
            return reject(error)
        })
    })
}
