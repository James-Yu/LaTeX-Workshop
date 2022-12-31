import * as path from 'path'
import Mocha from 'mocha'
import glob from 'glob'

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 15000,
        retries: process.env['LATEXWORKSHOP_CLI'] ? 3 : 0
    })

    return new Promise((resolve, reject) => {
        glob('**/**.test.js', { cwd: __dirname }, (error, files) => {
            if (error) {
                return reject(error)
            }

            // Add files to the test suite
            files.forEach(f => mocha.addFile(path.resolve(__dirname, f)))

            try {
                // Run the mocha test
                mocha.run(failures => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`))
                    } else {
                        resolve()
                    }
                })
            } catch (runError) {
                console.error(runError)
                reject(runError)
            }
        })
    })
}
