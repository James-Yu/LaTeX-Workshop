import * as assert from 'assert'
import * as path from 'path'

import { getFixtureDir, runUnitTestWithFixture, waitLatexWorkshopActivated } from '../../../utils/ciutils'

import {SyncTexJs} from '../../../../src/components/locatorlib/synctex'
import {decycle} from '../../../utils/decycle'


suite('unit test suite', () => {

    suiteSetup(() => {
    })

    runUnitTestWithFixture('fixture010_synctex', 'test synctex', async () => {
        const fixtureDir = getFixtureDir()
        const pdfFilePath = path.join(fixtureDir, 't.pdf')
        const extension = (await waitLatexWorkshopActivated()).exports.realExtension
        assert.ok(extension)
        const synctexjs = new SyncTexJs(extension)
        const ret = synctexjs.parseSyncTexForPdf(pdfFilePath)
        const output = JSON.stringify(decycle(ret), null, '  ')
        // console.log(output)
        assert.ok(output)
    })

})
