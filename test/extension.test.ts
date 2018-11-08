//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert'
import * as path from 'path'
// import * as vscode from 'vscode'
import {Extension} from '../src/main'

// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", function () {
    const extension = new Extension()
    // Defines a Mocha unit test
    test("build a tex file whose root is self.", function() {
        const workspaceRoot = process.env.CODE_WORKSPACE_ROOT || process.env.PWD
        if (workspaceRoot === undefined) {
            assert.fail("workspaceRoot path must be set.")
            return
        }
        extension.builder.build(path.join(workspaceRoot, 'test/texfiles/rootToSelf/t.tex'))
    })
})