import { LanguageDefinition } from '../language'

import { NODE_CONVERTER } from './sql.codegenerator'
import { GRAMMAR_DESCRIPTION } from './sql.grammar'
import { SqlValidator } from './sql.validator'

export const LANGUAGE_DESCRIPTION: LanguageDefinition = {
  id: "sql",
  name: "SQL",
  emitters: NODE_CONVERTER,
  validators: [GRAMMAR_DESCRIPTION, SqlValidator]
}
