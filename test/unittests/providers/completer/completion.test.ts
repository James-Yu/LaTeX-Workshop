import {runUnitTestWithFixture, waitLatexWorkshopActivated} from '../../../utils/ciutils'
import {EnvSnippetType} from '../../../../src/providers/completer/environment'
import assert from 'assert'


suite('unit test suite: completion', () => {

    runUnitTestWithFixture('fixture001', 'test default envs', async () => {
        const extension = (await waitLatexWorkshopActivated()).exports.extension
        assert.ok(extension)
        let defaultEnvs = extension.completer.environment.getDefaultEnvs(EnvSnippetType.AsCommand).map(e => e.label)
        assert(defaultEnvs.includes('document'))
        assert(defaultEnvs.includes('align'))
        defaultEnvs = extension.completer.environment.getDefaultEnvs(EnvSnippetType.AsName).map(e => e.label)
        assert(defaultEnvs.includes('document'))
        assert(defaultEnvs.includes('align'))
        defaultEnvs = extension.completer.environment.getDefaultEnvs(EnvSnippetType.ForBegin).map(e => e.label)
        assert(defaultEnvs.includes('document'))
        assert(defaultEnvs.includes('align'))
    })

    runUnitTestWithFixture('fixture001', 'test default cmds', async () => {
        const extension = (await waitLatexWorkshopActivated()).exports.extension
        assert.ok(extension)
        const defaultCommands = extension.completer.command.getDefaultCmds().map(e => e.label)
        assert(defaultCommands.includes('\\begin'))
        assert(defaultCommands.includes('\\left('))
        assert(defaultCommands.includes('\\section{title}'))
    })

})
