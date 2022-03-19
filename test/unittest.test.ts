import * as assert from 'assert'
import * as process from 'process'
import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'


import {
    runTestWithFixture,
} from './utils'

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

function checkDictKeys(keys: string[], expectedKeys: string[], optKeys: string[] = []): boolean {
    return keys.every(k => expectedKeys.includes(k) || optKeys.includes(k)) && expectedKeys.every(k => keys.includes(k))
}

suite('unit test suite', () => {

    suiteSetup(() => {
        const config = vscode.workspace.getConfiguration()
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            return config.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
        return
    })

    runTestWithFixture('fixture001', 'check default environment .json completion file', () => {
        const extensionRoot = path.resolve(__dirname, '../../')
        const file = `${extensionRoot}/data/environments.json`
        const envs = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: EnvType}
        assert.ok(Object.keys(envs).length > 0)
        Object.keys(envs).forEach(name => {
            assert.ok(
                checkDictKeys(
                    Object.keys(envs[name]),
                    ['name'],
                    ['snippet', 'detail']
                ),
                file + ': ' + JSON.stringify(envs[name])
            )
        })
        return Promise.resolve()
    })

    runTestWithFixture('fixture001', 'check environments from package .json completion files', () => {
        const extensionRoot = path.resolve(__dirname, '../../')
        const files = glob.sync('data/packages/*_env.json', {cwd: extensionRoot})
        files.forEach(file => {
            const envs = JSON.parse(fs.readFileSync(path.join(extensionRoot, file), {encoding: 'utf8'})) as {[key: string]: EnvType}
            assert.ok(Object.keys(envs).length > 0)
            Object.keys(envs).forEach(name => {
                assert.ok(
                    checkDictKeys(
                        Object.keys(envs[name]),
                        ['name', 'snippet', 'detail', 'package']
                    ),
                    file + ': ' + JSON.stringify(envs[name])
                )
            })
        })
        return Promise.resolve()
    })

    runTestWithFixture('fixture001', 'check default commands .json completion file', () => {
        const extensionRoot = path.resolve(__dirname, '../../')
        const file = `${extensionRoot}/data/commands.json`
        const cmds = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: CmdType}
        assert.ok(Object.keys(cmds).length > 0)
        Object.keys(cmds).forEach(name => {
            assert.ok(
                checkDictKeys(
                    Object.keys(cmds[name]),
                    ['command'],
                    ['snippet', 'documentation', 'detail', 'postAction', 'label']
                ),
                file + ': ' + JSON.stringify(cmds[name])
            )
        })
        return Promise.resolve()
    })

    runTestWithFixture('fixture001', 'check commands from package .json completion files', () => {
        const extensionRoot = path.resolve(__dirname, '../../')
        const files = glob.sync('data/packages/*_cmd.json', {cwd: extensionRoot})
        files.forEach(file => {
            const cmds = JSON.parse(fs.readFileSync(path.join(extensionRoot, file), {encoding: 'utf8'})) as {[key: string]: CmdType}
            assert.ok(Object.keys(cmds).length > 0)
            Object.keys(cmds).forEach(name => {
                assert.ok(
                    checkDictKeys(
                        Object.keys(cmds[name]),
                        ['command', 'snippet'],
                        ['documentation', 'detail', 'postAction', 'package', 'label']
                    ),
                    file + ': ' + JSON.stringify(cmds[name])
                )
            })
        })
        return Promise.resolve()
    })


})
