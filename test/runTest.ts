import * as path from 'path'
import * as process from 'process'
import * as glob from 'glob'
import * as tmpFile from 'tmp'
import { runTests } from 'vscode-test'

async function runTestsOnEachFixture(targetName: 'build' | 'viewer') {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../')
    const extensionTestsPath = path.resolve(__dirname, `./${targetName}.index`)
    const tmpdir = tmpFile.dirSync({ unsafeCleanup: true })
    const fixtures = glob.sync(`test/fixtures/${targetName}/*`, { cwd: extensionDevelopmentPath })

    let testBuildWorkspaces: string[] = []
    const fixturePatterns = process.argv.slice(2).filter(s => !/^-/.exec(s))
    if (fixturePatterns.length === 0) {
        testBuildWorkspaces = fixtures
    } else {
        testBuildWorkspaces = fixtures.filter( fixture => {
            return fixturePatterns.some( pat => fixture.includes(pat) )
        })
    }

    for (const testWorkspace of testBuildWorkspaces) {
        await runTests({
            version: '1.42.1',
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                testWorkspace,
                '--user-data-dir=' + tmpdir.name,
                '--disable-extensions',
                '--disable-gpu'
            ],
            extensionTestsEnv: { LATEXWORKSHOP_CI_ENABLE_DOCKER: process.argv.includes('--enable-docker') ? '1' : undefined }
        })
    }
}

async function main() {
    try {
        await runTestsOnEachFixture('build')
        await runTestsOnEachFixture('viewer')
    } catch (err) {
        console.error('Failed to run tests')
        process.exit(1)
    }
}

main()
