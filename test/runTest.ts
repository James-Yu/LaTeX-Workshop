import * as path from 'path'
import * as process from 'process'
import * as tmpFile from 'tmp'
import { runTests } from '@vscode/test-electron'

async function runTestSuite() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../')
        const extensionTestsPath = path.resolve(__dirname, './units/index')
        const userData = tmpFile.dirSync({ unsafeCleanup: true }).name

        await runTests({
            version: '1.114.0',
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                'test/units/test.code-workspace',
                '--user-data-dir=' + userData,
                '--extensions-dir=' + tmpFile.dirSync({ unsafeCleanup: true }).name,
                '--remote-debugging-port=0',
                '--disable-gpu'
            ],
            extensionTestsEnv: {
                LATEXWORKSHOP_CITEST: '1',
                LATEXWORKSHOP_TEST_USER_DATA: userData
            }
        })
    } catch (error) {
        console.error(error)
        console.error('Failed to run tests')
        process.exit(1)
    }
}

async function main() {
    try {
        await runTestSuite()
    } catch (_) {
        console.error('Failed to run tests')
        process.exit(1)
    }
}

void main()
