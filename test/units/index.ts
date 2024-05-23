import * as path from 'path'
import Mocha from 'mocha'
import { glob } from 'glob'

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'bdd',
        color: true,
        timeout: process.env['LATEXWORKSHOP_CLI'] ? 10000 : 8000,
        retries: process.env['LATEXWORKSHOP_CLI'] ? 8 : 2
    })

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
