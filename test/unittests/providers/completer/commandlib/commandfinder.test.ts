import {runUnitTestWithFixture} from '../../../../utils/ciutils'
import {isTriggerSuggestNeeded} from '../../../../../src/providers/completer/commandlib/commandfinder'
import assert from 'assert'


suite('unit test suite', () => {

    runUnitTestWithFixture('fixture001', 'test commandlib/commandfinder', () => {
        assert.ok(!isTriggerSuggestNeeded('frac'))
    })

})
