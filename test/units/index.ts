import * as path from 'path'
import Mocha from 'mocha'
import { glob } from 'glob'
import { hooks } from './utils'

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'bdd',
        color: true,
        timeout: process.env['LATEXWORKSHOP_CITEST'] ? 10000 : 5000,
        retries: process.env['LATEXWORKSHOP_CITEST'] ? 3 : 0
    })

    mocha.suite.on('pre-require', (context) => {
        context.describe.only = process.env['LATEXWORKSHOP_CITEST'] ? context.describe : context.describe.only
        context.it.only = process.env['LATEXWORKSHOP_CITEST'] ? context.it : context.it.only
    })

    mocha.rootHooks(hooks)

    ;(globalThis as any).mocha = mocha

    return new Promise((resolve, reject) => {
        glob.sync('**/*.test.ts', { cwd: path.resolve(__dirname, '../../../test/units') })
            .map(sourceFile => sourceFile.replace(/\.ts$/, '.js'))
            .filter(compiledFile => process.env['LATEXWORKSHOP_UNIT'] ? process.env['LATEXWORKSHOP_UNIT'].split(',').some(candidate => compiledFile.includes(candidate)) : true)
            .sort()
            .map(compiledFile => path.resolve(__dirname, compiledFile))
            .forEach(testFile => mocha.addFile(testFile))
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
