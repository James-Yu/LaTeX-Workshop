import * as assert from 'assert'
import * as process from 'process'
import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'

import { runTestWithFixture } from '../utils'
import { getExtensionDevelopmentPath } from '../runnerutils'

type EnvType = {
    name: string,
    snippet?: string,
    detail?: string,
    package?: string
}

type CmdType = {
    command: string,
    snippet?: string,
    documentation?: string,
    package?: string,
    detail?: string,
    postAction?: string,
    label?: string
}

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

    runTestWithFixture('fixture001', 'test runnerutils', () => {
        const extensionRoot = getExtensionDevelopmentPath()
        assert.ok(fs.existsSync(path.join(extensionRoot, 'package.json')))
    })

    runTestWithFixture('fixture001', 'check default environment .json completion file', () => {
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

    runTestWithFixture('fixture001', 'check environments from package .json completion files', () => {
        const extensionRoot = getExtensionDevelopmentPath()
        const files = glob.sync('data/packages/*_env.json', {cwd: extensionRoot})
        files.forEach(file => {
            const envs = JSON.parse(fs.readFileSync(path.join(extensionRoot, file), {encoding: 'utf8'})) as {[key: string]: EnvType}
            assert.ok(Object.keys(envs).length > 0)
            Object.keys(envs).forEach(name => {
                assertDictKeyNames(
                    Object.keys(envs[name]),
                    ['name', 'snippet', 'detail', 'package'],
                    [],
                    file + ': ' + JSON.stringify(envs[name])
                )
            })
        })
    })

    runTestWithFixture('fixture001', 'check default commands .json completion file', () => {
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

    runTestWithFixture('fixture001', 'check commands from package .json completion files', () => {
        const extensionRoot = getExtensionDevelopmentPath()
        const files = glob.sync('data/packages/*_cmd.json', {cwd: extensionRoot})
        files.forEach(file => {
            const cmds = JSON.parse(fs.readFileSync(path.join(extensionRoot, file), {encoding: 'utf8'})) as {[key: string]: CmdType}
            assert.ok(Object.keys(cmds).length > 0)
            Object.keys(cmds).forEach(name => {
                assertDictKeyNames(
                    Object.keys(cmds[name]),
                    ['command', 'snippet'],
                    ['documentation', 'detail', 'postAction', 'package', 'label'],
                    file + ': ' + JSON.stringify(cmds[name])
                )
            })
        })
    })


})
