import { LANGUAGE_DESCRIPTION } from '../../syntaxtree/regex'

import { LanguageModelDescription } from '../language-model.description'
import { BlockDescription } from '../block.description'

export const LANGUAGE_MODEL: LanguageModelDescription = {
  id: "regex",
  displayName: "Reguläre Ausdrücke",
  language: LANGUAGE_DESCRIPTION,
  blocks: [
    {
      describedType: {
        languageName: "regex",
        typeName: "root"
      },
      defaultNode: {
        language: "regex",
        name: "root",
        children: {
          "expressions": []
        }
      },
      sidebar: {
        category: "Regulärer Ausdruck",
        displayName: "Regulärer Ausdruck",
      }
    },
    {
      describedType: {
        languageName: "regex",
        typeName: "constant"
      },
      defaultNode: {
        language: "regex",
        name: "expr",
        children: {
          "singleExpression": [
            {
              language: "regex",
              name: "constant",
              properties: {
                value: "a"
              }
            }
          ]
        }
      },
      sidebar: {
        category: "Regulärer Ausdruck",
        displayName: "Konstante 'a'",
      }
    },
    {
      describedType: {
        languageName: "regex",
        typeName: "constant"
      },
      defaultNode: {
        language: "regex",
        name: "expr",
        children: {
          "singleExpression": [
            {
              language: "regex",
              name: "constant",
              properties: {
                value: "b"
              }
            }
          ]
        }
      },
      sidebar: {
        category: "Regulärer Ausdruck",
        displayName: "Konstante 'b'",
      }
    },
    {
      describedType: {
        languageName: "regex",
        typeName: "alternative"
      },
      defaultNode: {
        language: "regex",
        name: "expr",
        children: {
          "singleExpression": [
            {
              language: "regex",
              name: "alternative",
              children: {
                "expressions": [
                  {
                    language: "regex",
                    name: "expr",
                  },
                  {
                    language: "regex",
                    name: "expr",
                  }
                ]
              }
            }
          ]
        }
      },
      sidebar: {
        category: "Regulärer Ausdruck",
        displayName: "Alternative"
      }
    }
  ]
}
