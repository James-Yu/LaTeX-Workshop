import {runUnitTestWithFixture, waitLatexWorkshopActivated} from '../../../utils/ciutils'
import {EnvSnippetType} from '../../../../src/providers/completer/environment'
import assert from 'assert'


suite('unit test suite: completer/environment', () => {

    runUnitTestWithFixture('fixture001', 'test default envs', async () => {
        const extension = (await waitLatexWorkshopActivated()).exports.extension
        assert.ok(extension)
        let defaultEnvCommands = extension.completer.environment.getDefaultEnvs(EnvSnippetType.AsCommand).map(e => e.label)
        assert(defaultEnvCommands.includes('document'))
        assert(defaultEnvCommands.includes('align'))
        defaultEnvCommands = extension.completer.environment.getDefaultEnvs(EnvSnippetType.AsName).map(e => e.label)
        assert(defaultEnvCommands.includes('document'))
        assert(defaultEnvCommands.includes('align'))
        defaultEnvCommands = extension.completer.environment.getDefaultEnvs(EnvSnippetType.ForBegin).map(e => e.label)
        assert(defaultEnvCommands.includes('document'))
        assert(defaultEnvCommands.includes('align'))
    })

})
