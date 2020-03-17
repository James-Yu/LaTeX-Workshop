import * as path from 'path'
import * as Mocha from 'mocha'
import * as glob from 'glob'

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 0
    })
    const testsRoot = path.resolve(__dirname, '.')

    return new Promise((resolve, reject) => {
        glob('**/completion.test.js', { cwd: testsRoot }, (err, files) => {
            if (err) {
                return reject(err)
            }

            // Add files to the test suite
            files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)))

            try {
                // Run the mocha test
                mocha.run(failures => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`))
                    } else {
                        resolve()
                    }
                })
            } catch (e) {
                console.error(e)
                reject(e)
            }
        })
    })
}
