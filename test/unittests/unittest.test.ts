import * as assert from 'assert'
import * as process from 'process'
import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'

import type { PkgType } from '../../src/providers/completion'
import type { CmdType } from '../../src/providers/completer/command'
import type { EnvType } from '../../src/providers/completer/environment'
import { runUnitTestWithFixture } from '../utils/ciutils'
import { getExtensionDevelopmentPath } from '../utils/runnerutils'

function assertDictKeyNames(keys: string[], expectedKeys: string[], optKeys: string[] = [], message: string): void {
    assert.ok(
        keys.every(k => expectedKeys.includes(k) || optKeys.includes(k)) && expectedKeys.every(k => keys.includes(k)),
        message
    )
}

suite('unit test suite', () => {

    suiteSetup(() => {
        const config = vscode.workspace.getConfiguration()
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            return config.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
        return
    })

    runUnitTestWithFixture('fixture001', 'test runnerutils', () => {
        const extensionRoot = getExtensionDevelopmentPath()
        assert.ok(fs.existsSync(path.join(extensionRoot, 'package.json')))
    })

    runUnitTestWithFixture('fixture001', 'check default environment .json completion file', () => {
        const extensionRoot = getExtensionDevelopmentPath()
        const file = `${extensionRoot}/data/environments.json`
        const envs = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: EnvType}
        assert.ok(Object.keys(envs).length > 0)
        Object.keys(envs).forEach(name => {
            assertDictKeyNames(
                Object.keys(envs[name]),
                ['name'],
                ['snippet', 'detail'],
                file + ': ' + JSON.stringify(envs[name])
            )
        })
    })

    runUnitTestWithFixture('fixture001', 'check default commands .json completion file', () => {
        const extensionRoot = getExtensionDevelopmentPath()
        const file = `${extensionRoot}/data/commands.json`
        const cmds = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: CmdType}
        assert.ok(Object.keys(cmds).length > 0)
        Object.keys(cmds).forEach(name => {
            assertDictKeyNames(
                Object.keys(cmds[name]),
                ['command'],
                ['snippet', 'documentation', 'detail', 'postAction', 'label'],
                file + ': ' + JSON.stringify(cmds[name])
            )
        })
    })

    runUnitTestWithFixture('fixture001', 'check package .json completion files', () => {
        const extensionRoot = getExtensionDevelopmentPath()
        const files = glob.sync('data/packages/*.json', {cwd: extensionRoot})
        files.forEach(file => {
            const pkg = JSON.parse(fs.readFileSync(path.join(extensionRoot, file), {encoding: 'utf8'})) as PkgType
            // assert.ok(Object.keys(cmds).length > 0)
            Object.keys(pkg.cmds).forEach(name => {
                assertDictKeyNames(
                    Object.keys(pkg.cmds[name]),
                    [],
                    ['command', 'snippet', 'option', 'keyvals', 'keyvalindex', 'documentation', 'detail'],
                    file + ': ' + JSON.stringify(pkg.cmds[name])
                )
            })

            // assert.ok(Object.keys(envs).length > 0)
            Object.keys(pkg.envs).forEach(name => {
                assertDictKeyNames(
                    Object.keys(pkg.envs[name]),
                    [],
                    ['name', 'snippet', 'detail', 'option', 'keyvals', 'keyvalindex'],
                    file + ': ' + JSON.stringify(pkg.envs[name])
                )
            })
        })
    })


})