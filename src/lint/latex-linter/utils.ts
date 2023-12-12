import * as os from 'os'
import type { ChildProcessWithoutNullStreams } from 'child_process'
import { lw } from '../../lw'

const logger = lw.log('Linter')

export function processWrapper(linterId: string, proc: ChildProcessWithoutNullStreams, stdin?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const startTime = process.hrtime()

        proc.stdout.setEncoding('binary')
        proc.stderr.setEncoding('binary')

        let stdout = ''
        proc.stdout.on('data', newStdout => {
            stdout += newStdout
        })

        let stderr = ''
        proc.stderr.on('data', newStderr => {
            stderr += newStderr
        })

        proc.on('error', err => {
            logger.log(`Linter for ${linterId} failed to spawn command, encountering error: ${err.message}`)
            return reject(err)
        })

        proc.on('exit', exitCode => {
            if (exitCode !== 0) {
                let msg: string
                if (stderr === '') {
                    msg = stderr
                } else {
                    msg = '\n' + stderr
                }
                logger.log(`Linter for ${linterId} failed with exit code ${exitCode} and error:${msg}`)
                return reject({ exitCode, stdout, stderr})
            } else {
                const [s, ms] = process.hrtime(startTime)
                logger.log(`Linter for ${linterId} successfully finished in ${s}s ${Math.round(ms / 1000000)}ms`)
                return resolve(stdout)
            }
        })

        if (stdin !== undefined) {
            proc.stdin.write(stdin)
            if (!stdin.endsWith(os.EOL)) {
                // Always ensure we end with EOL otherwise ChkTeX will report line numbers as off by 1.
                proc.stdin.write(os.EOL)
            }
            proc.stdin.end()
        }
    })
}
