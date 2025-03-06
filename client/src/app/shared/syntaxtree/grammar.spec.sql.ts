import * as AST from "../syntaxtree";
import * as Schema from "./grammar.description";
import { Validator } from "./validator";
import { ErrorCodes } from "./validation-result";
import { smartDropLocation } from "./drop";

/**
 * This grammar is close to the "real" grammar used for SQL (which is stored
 * somewhere on the server) and is not used during normal execution. But because
 * it is a rather complex grammar, it lends itself very well for testing.
 */
export const GRAMMAR_SQL_DESCRIPTION: Schema.GrammarDescription = {
  id: "7ec93f8a-5a01-4d4d-90b4-27c3f0ae4700",
  name: "sql",
  programmingLanguageId: "sql",
  root: { languageName: "sql", typeName: "query" },
  foreignTypes: {},
  visualisations: {},
  foreignVisualisations: {},
  types: {
    sql: {
      from: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                tags: ["keyword", "component"],
                type: "terminal",
                symbol: "FROM",
              },
              {
                name: "tables",
                type: "sequence",
                between: {
                  name: "columnSeparator",
                  type: "terminal",
                  symbol: ",",
                },
                nodeTypes: [
                  {
                    occurs: "+",
                    nodeType: "tableIntroduction",
                  },
                ],
              },
            ],
            orientation: "horizontal",
          },
          {
            tags: ["indent"],
            type: "container",
            children: [
              {
                name: "joins",
                type: "sequence",
                nodeTypes: [
                  {
                    occurs: "*",
                    nodeType: "join",
                  },
                ],
              },
            ],
            orientation: "vertical",
          },
        ],
      },
      join: {
        type: "oneOf",
        oneOf: ["crossJoin", "innerJoinUsing", "innerJoinOn"],
      },
      query: {
        type: "oneOf",
        oneOf: ["querySelect", "queryDelete"],
      },
      where: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                tags: ["keyword", "component"],
                type: "terminal",
                symbol: "WHERE",
              },
              {
                type: "container",
                children: [
                  {
                    name: "expressions",
                    type: "sequence",
                    nodeTypes: [
                      {
                        occurs: "1",
                        nodeType: {
                          typeName: "expression",
                          languageName: "sql",
                        },
                      },
                      {
                        occurs: "*",
                        nodeType: {
                          typeName: "whereAdditional",
                          languageName: "sql",
                        },
                      },
                    ],
                  },
                ],
                orientation: "horizontal",
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      delete: {
        type: "concrete",
        attributes: [
          {
            tags: ["keyword", "component"],
            type: "terminal",
            symbol: "DELETE",
          },
        ],
      },
      select: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                tags: ["keyword", "component"],
                type: "terminal",
                symbol: "SELECT",
              },
              {
                name: "distinct",
                type: "sequence",
                nodeTypes: [
                  {
                    occurs: "?",
                    nodeType: "distinct",
                  },
                ],
              },
              {
                tags: ["allow-wrap"],
                type: "container",
                children: [
                  {
                    name: "columns",
                    type: "parentheses",
                    group: {
                      type: "allowed",
                      nodeTypes: [
                        {
                          occurs: "*",
                          nodeType: "expression",
                        },
                        {
                          occurs: "?",
                          nodeType: "starOperator",
                        },
                      ],
                    },
                    between: {
                      name: "columnSeparator",
                      tags: ["space-after"],
                      type: "terminal",
                      symbol: ",",
                    },
                    cardinality: "1",
                  },
                ],
                orientation: "horizontal",
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      groupBy: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                tags: ["keyword", "component"],
                type: "terminal",
                symbol: "GROUP BY",
              },
              {
                name: "expressions",
                type: "allowed",
                between: {
                  name: "columnSeparator",
                  tags: ["space-after"],
                  type: "terminal",
                  symbol: ",",
                },
                nodeTypes: [
                  {
                    occurs: "+",
                    nodeType: {
                      typeName: "expression",
                      languageName: "sql",
                    },
                  },
                ],
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      orderBy: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                tags: ["keyword", "component"],
                type: "terminal",
                symbol: "ORDER BY",
              },
              {
                name: "expressions",
                type: "parentheses",
                group: {
                  type: "allowed",
                  nodeTypes: [
                    {
                      occurs: "*",
                      nodeType: {
                        typeName: "expression",
                        languageName: "sql",
                      },
                    },
                    {
                      occurs: "*",
                      nodeType: {
                        typeName: "sortOrder",
                        languageName: "sql",
                      },
                    },
                  ],
                },
                between: {
                  name: "columnSeparator",
                  tags: ["space-after"],
                  type: "terminal",
                  symbol: ",",
                },
                cardinality: "+",
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      constant: {
        type: "concrete",
        attributes: [
          {
            base: "string",
            name: "value",
            type: "property",
          },
        ],
      },
      distinct: {
        type: "concrete",
        attributes: [
          {
            tags: ["keyword", "space-after"],
            type: "terminal",
            symbol: "DISTINCT",
          },
        ],
      },
      crossJoin: {
        type: "concrete",
        attributes: [
          {
            name: "table",
            type: "sequence",
            nodeTypes: ["tableIntroduction"],
          },
        ],
      },
      parameter: {
        type: "concrete",
        attributes: [
          {
            name: "colon",
            tags: ["parameter"],
            type: "terminal",
            symbol: ":",
          },
          {
            base: "string",
            name: "name",
            tags: ["parameter"],
            type: "property",
          },
        ],
      },
      sortOrder: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                name: "expression",
                type: "sequence",
                nodeTypes: ["expression"],
              },
              {
                base: "string",
                name: "order",
                tags: ["keyword", "space-before"],
                type: "property",
                restrictions: [
                  {
                    type: "enum",
                    value: ["ASC", "DESC"],
                  },
                ],
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      columnName: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                base: "string",
                name: "refTableName",
                tags: ["explicit-spaces"],
                type: "property",
              },
              {
                name: "dot",
                type: "terminal",
                symbol: ".",
              },
              {
                base: "string",
                name: "columnName",
                tags: ["explicit-spaces"],
                type: "property",
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      expression: {
        type: "oneOf",
        oneOf: [
          "columnName",
          "binaryExpression",
          "constant",
          "parameter",
          "functionCall",
          "parentheses",
        ],
      },
      innerJoinOn: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                tags: ["keyword", "component"],
                type: "terminal",
                symbol: "INNER JOIN",
              },
              {
                name: "table",
                type: "sequence",
                nodeTypes: ["tableIntroduction"],
              },
              {
                tags: ["keyword", "space-around"],
                type: "terminal",
                symbol: "ON",
              },
              {
                name: "on",
                type: "sequence",
                nodeTypes: ["expression"],
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      parentheses: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                name: "parenOpen",
                type: "terminal",
                symbol: "(",
              },
              {
                name: "expression",
                type: "sequence",
                nodeTypes: ["expression"],
              },
              {
                name: "parenClose",
                type: "terminal",
                symbol: ")",
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      queryDelete: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                name: "delete",
                type: "sequence",
                nodeTypes: ["delete"],
              },
              {
                name: "from",
                type: "sequence",
                nodeTypes: ["from"],
              },
              {
                name: "where",
                type: "sequence",
                nodeTypes: [
                  {
                    occurs: "?",
                    nodeType: "where",
                  },
                ],
              },
            ],
            orientation: "vertical",
          },
        ],
      },
      querySelect: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                name: "select",
                type: "sequence",
                nodeTypes: ["select"],
              },
              {
                name: "from",
                type: "sequence",
                nodeTypes: ["from"],
              },
              {
                name: "where",
                type: "sequence",
                nodeTypes: [
                  {
                    occurs: "?",
                    nodeType: "where",
                  },
                ],
              },
              {
                name: "groupBy",
                type: "sequence",
                nodeTypes: [
                  {
                    occurs: "?",
                    nodeType: "groupBy",
                  },
                ],
              },
              {
                name: "orderBy",
                type: "sequence",
                nodeTypes: [
                  {
                    occurs: "?",
                    nodeType: "orderBy",
                  },
                ],
              },
            ],
            orientation: "vertical",
          },
        ],
      },
      functionCall: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                base: "string",
                name: "name",
                tags: ["keyword"],
                type: "property",
              },
              {
                name: "paren-open",
                type: "terminal",
                symbol: "(",
              },
              {
                name: "distinct",
                type: "sequence",
                nodeTypes: [
                  {
                    occurs: "?",
                    nodeType: "distinct",
                  },
                ],
              },
              {
                name: "arguments",
                type: "sequence",
                between: {
                  name: "param-separator",
                  type: "terminal",
                  symbol: ",",
                },
                nodeTypes: [
                  {
                    occurs: "*",
                    nodeType: "expression",
                  },
                ],
              },
              {
                name: "paren-close",
                type: "terminal",
                symbol: ")",
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      starOperator: {
        type: "concrete",
        attributes: [
          {
            tags: ["operator"],
            type: "terminal",
            symbol: "*",
          },
        ],
      },
      innerJoinUsing: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                tags: ["keyword", "component"],
                type: "terminal",
                symbol: "INNER JOIN",
              },
              {
                name: "table",
                type: "sequence",
                nodeTypes: ["tableIntroduction"],
              },
              {
                tags: ["keyword", "space-around"],
                type: "terminal",
                symbol: "USING",
              },
              {
                name: "using",
                type: "sequence",
                nodeTypes: ["expression"],
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      whereAdditional: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                base: "string",
                name: "operator",
                tags: ["operator"],
                type: "property",
                restrictions: [
                  {
                    type: "enum",
                    value: ["AND", "OR"],
                  },
                ],
              },
              {
                name: "expression",
                type: "sequence",
                nodeTypes: ["expression"],
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      binaryExpression: {
        type: "concrete",
        attributes: [
          {
            type: "container",
            children: [
              {
                name: "lhs",
                type: "sequence",
                nodeTypes: ["expression"],
              },
              {
                name: "operator",
                type: "sequence",
                nodeTypes: ["relationalOperator"],
              },
              {
                name: "rhs",
                type: "sequence",
                nodeTypes: ["expression"],
              },
            ],
            orientation: "horizontal",
          },
        ],
      },
      tableIntroduction: {
        type: "concrete",
        attributes: [
          {
            base: "string",
            name: "name",
            tags: ["explicit-spaces"],
            type: "property",
          },
        ],
      },
      relationalOperator: {
        type: "concrete",
        attributes: [
          {
            base: "string",
            name: "operator",
            tags: ["operator", "space-around"],
            type: "property",
            restrictions: [
              {
                type: "enum",
                value: ["<", "<=", "=", "<>", ">=", ">", "LIKE", "NOT LIKE"],
              },
            ],
          },
        ],
      },
    },
  },
};

describe("Complex Spec Grammar: SQL", () => {
  describe("Validation", () => {
    it("Invalid: Empty SELECT-query", () => {
      const v = new Validator([GRAMMAR_SQL_DESCRIPTION]);

      const astDesc: AST.NodeDescription = {
        language: "sql",
        name: "querySelect",
      };

      const ast = new AST.SyntaxNode(astDesc, undefined);
      const res = v.validateFromRoot(ast);

      expect(res.errors.length).toEqual(2);
      expect(res.errors[0].code).toEqual(ErrorCodes.MissingChild);
      expect(res.errors[1].code).toEqual(ErrorCodes.MissingChild);
    });

    it("Valid: SELECT * FROM foo", () => {
      const v = new Validator([GRAMMAR_SQL_DESCRIPTION]);

      const astDesc: AST.NodeDescription = {
        language: "sql",
        name: "querySelect",
        children: {
          select: [
            {
              language: "sql",
              name: "select",
              children: {
                columns: [
                  {
                    language: "sql",
                    name: "starOperator",
                  },
                ],
              },
            },
          ],
          from: [
            {
              language: "sql",
              name: "from",
              children: {
                tables: [
                  {
                    language: "sql",
                    name: "tableIntroduction",
                    properties: {
                      name: "foo",
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const ast = new AST.SyntaxNode(astDesc, undefined);
      const res = v.validateFromRoot(ast);

      expect(res.errors.length).toEqual(0);
    });

    it("Valid: SELECT * FROM foo, bar", () => {
      const v = new Validator([GRAMMAR_SQL_DESCRIPTION]);

      const astDesc: AST.NodeDescription = {
        language: "sql",
        name: "querySelect",
        children: {
          select: [
            {
              language: "sql",
              name: "select",
              children: {
                columns: [
                  {
                    language: "sql",
                    name: "starOperator",
                  },
                ],
              },
            },
          ],
          from: [
            {
              language: "sql",
              name: "from",
              children: {
                tables: [
                  {
                    language: "sql",
                    name: "tableIntroduction",
                    properties: {
                      name: "foo",
                    },
                  },
                ],
                joins: [
                  {
                    language: "sql",
                    name: "crossJoin",
                    children: {
                      table: [
                        {
                          language: "sql",
                          name: "tableIntroduction",
                          properties: {
                            name: "bar",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const ast = new AST.SyntaxNode(astDesc, undefined);
      const res = v.validateFromRoot(ast);

      expect(res.errors.length).toEqual(0);
    });

    it("Valid: SELECT * FROM foo, bar WHERE foo.id = bar.id", () => {
      const v = new Validator([GRAMMAR_SQL_DESCRIPTION]);

      const astDesc: AST.NodeDescription = {
        language: "sql",
        name: "querySelect",
        children: {
          select: [
            {
              language: "sql",
              name: "select",
              children: {
                columns: [
                  {
                    language: "sql",
                    name: "starOperator",
                  },
                ],
              },
            },
          ],
          from: [
            {
              language: "sql",
              name: "from",
              children: {
                tables: [
                  {
                    language: "sql",
                    name: "tableIntroduction",
                    properties: {
                      name: "foo",
                    },
                  },
                ],
                joins: [
                  {
                    language: "sql",
                    name: "crossJoin",
                    children: {
                      table: [
                        {
                          language: "sql",
                          name: "tableIntroduction",
                          properties: {
                            name: "bar",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
          where: [
            {
              language: "sql",
              name: "where",
              children: {
                expressions: [
                  {
                    language: "sql",
                    name: "binaryExpression",
                    children: {
                      lhs: [
                        {
                          language: "sql",
                          name: "columnName",
                          properties: {
                            columnName: "id",
                            refTableName: "foo",
                          },
                        },
                      ],
                      operator: [
                        {
                          language: "sql",
                          name: "relationalOperator",
                          properties: {
                            operator: "=",
                          },
                        },
                      ],
                      rhs: [
                        {
                          language: "sql",
                          name: "columnName",
                          properties: {
                            columnName: "id",
                            refTableName: "bar",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const ast = new AST.SyntaxNode(astDesc, undefined);
      const res = v.validateFromRoot(ast);

      expect(res.errors).toEqual([]);
    });

    it("Valid: SELECT * FROM foo, bar WHERE foo.id = bar.id AND foo.id = 2", () => {
      const v = new Validator([GRAMMAR_SQL_DESCRIPTION]);

      const astDesc: AST.NodeDescription = {
        language: "sql",
        name: "querySelect",
        children: {
          select: [
            {
              language: "sql",
              name: "select",
              children: {
                columns: [
                  {
                    language: "sql",
                    name: "starOperator",
                  },
                ],
              },
            },
          ],
          from: [
            {
              language: "sql",
              name: "from",
              children: {
                tables: [
                  {
                    language: "sql",
                    name: "tableIntroduction",
                    properties: {
                      name: "foo",
                    },
                  },
                ],
                joins: [
                  {
                    language: "sql",
                    name: "crossJoin",
                    children: {
                      table: [
                        {
                          language: "sql",
                          name: "tableIntroduction",
                          properties: {
                            name: "bar",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
          where: [
            {
              language: "sql",
              name: "where",
              children: {
                expressions: [
                  {
                    language: "sql",
                    name: "binaryExpression",
                    children: {
                      lhs: [
                        {
                          language: "sql",
                          name: "columnName",
                          properties: {
                            columnName: "id",
                            refTableName: "foo",
                          },
                        },
                      ],
                      operator: [
                        {
                          language: "sql",
                          name: "relationalOperator",
                          properties: {
                            operator: "=",
                          },
                        },
                      ],
                      rhs: [
                        {
                          language: "sql",
                          name: "columnName",
                          properties: {
                            columnName: "id",
                            refTableName: "bar",
                          },
                        },
                      ],
                    },
                  },
                  {
                    language: "sql",
                    name: "whereAdditional",
                    children: {
                      expression: [
                        {
                          language: "sql",
                          name: "binaryExpression",
                          children: {
                            lhs: [
                              {
                                language: "sql",
                                name: "columnName",
                                properties: {
                                  columnName: "id",
                                  refTableName: "foo",
                                },
                              },
                            ],
                            operator: [
                              {
                                language: "sql",
                                name: "relationalOperator",
                                properties: {
                                  operator: "=",
                                },
                              },
                            ],
                            rhs: [
                              {
                                language: "sql",
                                name: "constant",
                                properties: {
                                  value: "2",
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                    properties: {
                      operator: "and",
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const ast = new AST.SyntaxNode(astDesc, undefined);
      const res = v.validateFromRoot(ast);

      expect(res.errors).toEqual([]);
    });
  });

  it("Error: Two SELECT nodes in QUERY_SELECT, but no FROM", () => {
    const astDesc: AST.NodeDescription = {
      name: "querySelect",
      language: "sql",
      children: {
        select: [
          {
            name: "select",
            language: "sql",
            children: {
              columns: [{ language: "sql", name: "starOperator" }],
            },
          },
          {
            name: "select",
            language: "sql",
            children: {
              columns: [{ language: "sql", name: "starOperator" }],
            },
          },
        ],
      },
    };

    const v = new Validator([GRAMMAR_SQL_DESCRIPTION]);
    const res = v.validateFromRoot(new AST.SyntaxTree(astDesc));

    expect(res.errors.map((e) => e.code)).toEqual([
      ErrorCodes.SuperflousChild,
      ErrorCodes.MissingChild,
    ]);
  });

  it('Smartly drops a "pure" SELECT on a partial Query', () => {
    const astDesc: AST.NodeDescription = {
      language: "sql",
      name: "querySelect",
      children: {
        from: [
          {
            language: "sql",
            name: "from",
            children: {
              tables: [
                {
                  language: "sql",
                  name: "tableIntroduction",
                  properties: {
                    name: "foo",
                  },
                },
              ],
              joins: [
                {
                  language: "sql",
                  name: "crossJoin",
                  children: {
                    table: [
                      {
                        language: "sql",
                        name: "tableIntroduction",
                        properties: {
                          name: "bar",
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    };

    const dropCandidates: AST.NodeDescription[] = [
      {
        name: "querySelect",
        children: {
          from: [
            {
              name: "from",
              language: "sql",
            },
          ],
          where: [],
          select: [
            {
              name: "select",
              language: "sql",
            },
          ],
          groupBy: [],
        },
        language: "sql",
      },
      {
        name: "select",
        language: "sql",
      },
    ];

    const v = new Validator([GRAMMAR_SQL_DESCRIPTION]);
    const ast = new AST.SyntaxTree(astDesc);

    expect(
      smartDropLocation(
        { allowAnyParent: true },
        v,
        ast,
        [],
        "block",
        dropCandidates
      )
    )
      .withContext(`Inserting at root`)
      .toEqual([
        {
          operation: "insert",
          algorithm: "allowAnyParent",
          location: [["select", 0]],
          nodeDescription: dropCandidates[1],
        },
      ]);
    expect(
      smartDropLocation(
        { allowAnyParent: true },
        v,
        ast,
        [["select", 0]],
        "block",
        dropCandidates
      )
    )
      .withContext(`Inserting at SELECT`)
      .toEqual([
        {
          operation: "insert",
          algorithm: "allowAnyParent",
          location: [["select", 0]],
          nodeDescription: dropCandidates[1],
        },
      ]);
    expect(
      smartDropLocation(
        { allowAnyParent: true },
        v,
        ast,
        [
          ["select", 0],
          ["columns", 0],
        ],
        "block",
        dropCandidates
      )
    )
      .withContext(`Inserting at first column of SELECT`)
      .toEqual([
        {
          operation: "insert",
          algorithm: "allowAnyParent",
          location: [["select", 0]],
          nodeDescription: dropCandidates[1],
        },
      ]);
  });
});
