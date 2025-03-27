import * as commands from './activity-bar'
import { checkCitations } from './checkcites'
import { clean } from './cleaner'
import { count } from './counter'
import { section } from './section'
import * as snippet from './snippet-view'
import { texdoc } from './texdoc'
import { texroot } from './texroot'
import * as liveshare from './liveshare'

export const extra = {
    checkCitations,
    clean,
    count,
    texdoc,
    texroot,
    section,
    commands,
    snippet,
    liveshare
}
