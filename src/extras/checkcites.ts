import * as vscode from 'vscode'
import { EOL } from 'os'
import { lw } from '../lw'
import * as path from 'path'

const logger = lw.log('Citations', 'Linter')

export function checkCitations() {
  logger.log('Checking citations.')
  const configuration = vscode.workspace.getConfiguration('latex-workshop', lw.file.toUri(lw.root.file.path!))
  const aux = lw.root.file.path?.replace(/\.tex$/, '.aux')
  const auxDir = path.join(path.dirname(aux || ''),path.normalize(configuration.get('latex.outDir') as string))
  const auxBaseName = aux ? path.basename(aux) : ''
  const auxFile = aux ? path.join(auxDir, auxBaseName) : undefined
  if (!auxFile) {
    logger.log('No aux file found.')
    return []
  }

  const {stdout, error} = lw.external.sync('checkcites', ['-u', auxFile], {
    cwd: lw.root.dir.path,
  })
  if (error) {
    logger.logError('Error checking citations.', error)
    return []
  }

  const result = stdout
    .toString()
    .split(EOL)
    .filter(l => l.startsWith('=>'))
    .map(l => l.slice(2).trim())

  logger.log(`Found ${result.length} unused citation(s).`)
  return result
}
