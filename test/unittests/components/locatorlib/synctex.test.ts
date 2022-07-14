import * as assert from 'assert'
import * as path from 'path'

import {getFixtureDir, runUnitTestWithFixture} from '../../../utils/ciutils'
import {FakeLogger} from '../../../utils/fakecomponents'

import {SyncTexJs} from '../../../../src/components/locatorlib/synctex'
import {decycle} from '../../../utils/decycle'


suite('unit test suite', () => {

    suiteSetup(() => {
    })

    runUnitTestWithFixture('fixture001', 'test synctex', () => {
        const fixtureDir = getFixtureDir()
        const pdfFilePath = path.join(fixtureDir, 'synctexjs', 't.pdf')
        const fakeExtension = {
            logger: new FakeLogger()
        }
        const synctexjs = new SyncTexJs(fakeExtension)
        const ret = synctexjs.parseSyncTexForPdf(pdfFilePath)
        const output = JSON.stringify(decycle(ret), null, '  ')
        // console.log(output)
        assert.ok(output)
    })

})
