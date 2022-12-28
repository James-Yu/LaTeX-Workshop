import * as path from 'path'
import * as process from 'process'
import * as glob from 'glob'
import * as tmpFile from 'tmp'
import { runTests } from '@vscode/test-electron'
import { getExtensionDevelopmentPath } from './utils/runnerutils'


async function runTestsOnEachFixture(targetName: 'viewer' | 'multiroot-ws') {
    const extensionDevelopmentPath = getExtensionDevelopmentPath()
    const extensionTestsPath = path.resolve(__dirname, `./${targetName}.index`)
    const tmpdir = tmpFile.dirSync({ unsafeCleanup: true })
    const extTmpdir = tmpFile.dirSync({ unsafeCleanup: true })
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

    for (let testWorkspace of testBuildWorkspaces) {
        if (testWorkspace.includes('multiroot-ws')) {
            testWorkspace += '/resource.code-workspace'
        }
        const nodejsTimeout = setTimeout(() => {
            console.log('runTestsOnEachFixture: Time out')
            process.exit(1)
        }, process.env.CI ? 600000 : 60000)
        await runTests({
            version: '1.71.0',
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                testWorkspace,
                '--user-data-dir=' + tmpdir.name,
                '--extensions-dir=' + extTmpdir.name,
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
        clearTimeout(nodejsTimeout)
    }
}
async function runTestSuites() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../')
        const extensionTestsPath = path.resolve(__dirname, './suites/index')

        const fixtures = [
            path.resolve(extensionDevelopmentPath, 'test', 'fixtures', 'testground'),
            path.resolve(extensionDevelopmentPath, 'test', 'fixtures', 'multiroot')
        ]
        for (const fixture of fixtures) {
            await runTests({
                version: '1.71.0',
                extensionDevelopmentPath,
                extensionTestsPath,
                launchArgs: [
                    fixture + path.basename(fixture) === 'multiroot' ? '/resource.code-workspace' : '',
                    '--user-data-dir=' + tmpFile.dirSync({ unsafeCleanup: true }).name,
                    '--extensions-dir=' + tmpFile.dirSync({ unsafeCleanup: true }).name
                ],
                extensionTestsEnv: {
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

async function main() {
    try {
        await runTestSuites()
        await runTestsOnEachFixture('viewer')
        await runTestsOnEachFixture('multiroot-ws')
    } catch (err) {
        console.error('Failed to run tests')
        process.exit(1)
    }
}

void main()
