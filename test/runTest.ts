import * as path from 'path'
import * as process from 'process'
import * as fs from 'fs'
import * as glob from 'glob'
import * as tmpFile from 'tmp'
import { runTests } from 'vscode-test'

function writeSettingsJson(userDataDir: string) {
    const configDir = path.join(userDataDir, 'User')
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir)
    }
    const settingFilePath = path.join(configDir, 'settings.json')
    const settingsJson =
`
{
    "extensions.autoUpdate": false,
    "extensions.autoCheckUpdates": false,
    "update.mode": "none"
}
`
    fs.writeFileSync(settingFilePath, settingsJson)
}

async function runTestsOnEachFixture(targetName: 'build' | 'rootfile' | 'viewer' | 'completion') {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../')
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

    writeSettingsJson(tmpdir.name)

    let firstTime = true
    for (const testWorkspace of testBuildWorkspaces) {
        const nodejsTimeout = setTimeout(() => process.exit(1), firstTime ? 3*60000 : 60000)
        await runTests({
            version: '1.60.2',
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                testWorkspace,
                '--user-data-dir=' + tmpdir.name,
                '--extensions-dir=' + extTmpdir.name,
                '--disable-extensions',
                '--disable-gpu'
            ],
            extensionTestsEnv: {
                LATEXWORKSHOP_CI_ENABLE_DOCKER: process.argv.includes('--enable-docker') ? '1' : undefined,
                LATEXWORKSHOP_CI: '1'
            }
        })
        clearTimeout(nodejsTimeout)
        firstTime = false
    }
}

async function main() {
    try {
        await runTestsOnEachFixture('rootfile')
        await runTestsOnEachFixture('build')
        await runTestsOnEachFixture('viewer')
        await runTestsOnEachFixture('completion')
    } catch (err) {
        console.error('Failed to run tests')
        process.exit(1)
    }
}

void main()
