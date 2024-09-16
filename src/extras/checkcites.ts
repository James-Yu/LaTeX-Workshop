import { EOL } from 'os'
import { lw } from '../lw'

const logger = lw.log('Citations', 'Linter')

export function checkCitations() {
  logger.log('Checking citations.')

  const auxFile = lw.root.file.path?.replace(/\.tex$/, '.aux')
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
