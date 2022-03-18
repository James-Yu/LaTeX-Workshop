import * as assert from 'assert'
import * as process from 'process'
import * as vscode from 'vscode'

import {stripComments} from '../src/utils/utils'

import {
    runTestWithFixture,
} from './utils'

suite('unit test suite', () => {

    suiteSetup(() => {
        const config = vscode.workspace.getConfiguration()
        if (process.env['LATEXWORKSHOP_CI_ENABLE_DOCKER']) {
            return config.update('latex-workshop.docker.enabled', true, vscode.ConfigurationTarget.Global)
        }
        return
    })

    runTestWithFixture('fixture001', 'basic unit tests', () => {
        assert.strictEqual(
            stripComments('abc % comment'),
            'abc'
        )
        return Promise.resolve()
    })
})
