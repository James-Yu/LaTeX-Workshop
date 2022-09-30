import {runUnitTestWithFixture} from '../../../../utils/ciutils'
import {isTriggerSuggestNeeded} from '../../../../../src/providers/completer/commandlib/commandfinder'
import assert from 'assert'


suite('unit test suite: commandlib/commandfinder', () => {

    runUnitTestWithFixture('fixture001', 'test isTriggerSuggestNeeded', () => {
        assert.ok(!isTriggerSuggestNeeded('frac'))
    })

})
