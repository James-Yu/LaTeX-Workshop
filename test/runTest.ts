import * as path from 'path'
import * as glob from 'glob'
import * as tmpFile from 'tmp'
import { runTests } from 'vscode-test'

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../')
        const extensionTestsPath = path.resolve(__dirname, './index')
        const tmpdir = tmpFile.dirSync({ unsafeCleanup: true })

        const testBuildWorkspaces = glob.sync('test/fixtures/build/*', { cwd: extensionDevelopmentPath })
        for (const testWorkspace of testBuildWorkspaces) {
            await runTests({
                extensionDevelopmentPath,
                extensionTestsPath,
                launchArgs: [
                    testWorkspace,
                    '--user-data-dir=' + tmpdir.name,
                    '--disable-extensions',
                    '--disable-gpu'
                ]
            })
        }

    } catch (err) {
        console.error('Failed to run tests')
        process.exit(1)
    }
}

main()
