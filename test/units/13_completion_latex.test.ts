import * as path from 'path'
import * as sinon from 'sinon'
import { lw } from '../../src/lw'
import { mock } from './utils'

describe(path.basename(__filename).split('.')[0] + ':', () => {
    before(() => {
        mock.init(lw, 'root', 'completion')
    })

    after(() => {
        sinon.restore()
    })
})
