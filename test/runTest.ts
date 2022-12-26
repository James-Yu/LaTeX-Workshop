import * as path from 'path'
import glob from 'glob'
import * as tmpFile from 'tmp'

import { runTests } from '@vscode/test-electron'

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../')
        const extensionTestsPath = path.resolve(__dirname, './suites/index')

        const fixtures = glob.sync('test/fixtures/*', { cwd: extensionDevelopmentPath })
        for (const fixture of fixtures) {
            await runTests({
                version: '1.71.0',
                extensionDevelopmentPath,
                extensionTestsPath,
                launchArgs: [
                    fixture,
                    '--user-data-dir=' + tmpFile.dirSync({ unsafeCleanup: true }).name,
                    '--extensions-dir=' + tmpFile.dirSync({ unsafeCleanup: true }).name,
                    '--lang=C',
                    '--disable-keytar',
                    '--disable-telemetry',
                    '--disable-gpu'
                ],
                extensionTestsEnv: {
                    LATEXWORKSHOP_CI_ENABLE_DOCKER: process.argv.includes('--enable-docker') ? '1' : undefined,
                    LATEXWORKSHOP_CI: '1'
                }
            })
        }
    } catch (error) {
        console.error(error)
        console.error('Failed to run tests')
        process.exit(1)
    }
}

void main()
