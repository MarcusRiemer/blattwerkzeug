import { NodeConverterRegistration } from "../codegenerator";
import {
  CodeGeneratorProcess,
  OutputSeparator,
} from "../codegenerator-process";
import { SyntaxNode } from "../syntaxtree";

/**
 * Helper function to generate all SQL components of a node
 */
function generateComponents(
  node: SyntaxNode,
  process: CodeGeneratorProcess<{}>
) {
  const componentNames = [
    "insert",
    "select",
    "update",
    "delete",
    "from",
    "where",
    "groupBy",
    "orderBy",
  ];
  const components = componentNames
    .map((n) => node.children[n])
    .filter((c) => !!c)
    .map((c) => c[0])
    .filter((c) => !!c);

  components.forEach((n) => {
    process.generateNode(n);
    process.addConvertedFragment("", node, OutputSeparator.NEW_LINE_AFTER);
  });
}

/**
 * Converts an SQL-AST to a properly indented SQL query.
 */
export const NODE_CONVERTER: NodeConverterRegistration[] = [
  {
    type: {
      languageName: "sql",
      typeName: "columnName",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        const columnName = node.properties["columnName"];
        const refTableName = node.properties["refTableName"];

        if (refTableName) {
          process.addConvertedFragment(`${refTableName}.${columnName}`, node);
        } else {
          process.addConvertedFragment(columnName, node);
        }
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "constant",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        const value = node.properties["value"];
                  process.addConvertedFragment(value, node);
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "parameter",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        const name = node.properties["name"];
        process.addConvertedFragment(`:${name}`, node);
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "starOperator",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        process.addConvertedFragment("*", node);
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "functionCall",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        process.addConvertedFragment(node.properties["name"], node);
        process.addConvertedFragment("(", node);

        const distinct = node.getChildrenInCategory("distinct");
        distinct.forEach((d) => {
          process.generateNode(d);
        });

        const args = node.getChildrenInCategory("arguments");

        // Possibly stick a space between `distinct` and following columns
        if (distinct.length > 0 && args.length > 0) {
          process.addConvertedFragment(" ", node);
        }

        args.forEach((a, idx, arr) => {
          process.generateNode(a);
          if (idx != arr.length - 1) {
            process.addConvertedFragment(", ", node);
          }
        });
        process.addConvertedFragment(")", node);
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "relationalOperator",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        const operator = node.properties["operator"];
        process.addConvertedFragment(operator, node);
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "binaryExpression",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        node
          .getChildrenInCategory("lhs")
          .forEach((c) => process.generateNode(c));
        process.addConvertedFragment(" ", node);
        node
          .getChildrenInCategory("operator")
          .forEach((c) => process.generateNode(c));
        process.addConvertedFragment(" ", node);
        node
          .getChildrenInCategory("rhs")
          .forEach((c) => process.generateNode(c));
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "parentheses",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        process.addConvertedFragment("(", node);
        node
          .getChildrenInCategory("expression")
          .forEach((c) => process.generateNode(c));
        process.addConvertedFragment(")", node);
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "expression",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        const expr = node.getChildrenInCategory("expression");
        expr.forEach((e) => process.generateNode(e));
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "select",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        process.addConvertedFragment(`SELECT `, node);

        const distinct = node.getChildrenInCategory("distinct");
        distinct.forEach((d) => {
          process.generateNode(d);
        });

        const columns = node.getChildrenInCategory("columns");

        // Possibly stick a space between `distinct` and following columns
        if (distinct.length > 0 && columns.length > 0) {
          process.addConvertedFragment(" ", node);
        }

        columns.forEach((c, idx, arr) => {
          process.generateNode(c);

          // Possible dirty hack: Force fully qualified column name
          if (false && c.typeName === "columnName") {
            const columnName = c.properties["columnName"];
            const tableName = c.properties["refTableName"];
            process.addConvertedFragment(
              ` AS "${tableName}.${columnName}"`,
              node
            );
          }

          // Stick commas in between
          if (idx != arr.length - 1) {
            process.addConvertedFragment(", ", node);
          }
        });
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "distinct",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        process.addConvertedFragment("DISTINCT", node);
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "tableIntroduction",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        const name = node.properties["name"];
        const alias = node.properties["alias"];
        if (alias) {
          process.addConvertedFragment(`${name} ${alias}`, node);
        } else {
          process.addConvertedFragment(name, node);
        }
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "crossJoin",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        process.addConvertedFragment(`JOIN `, node);
        node
          .getChildrenInCategory("table")
          .forEach((c) => process.generateNode(c));
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "innerJoinOn",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        process.addConvertedFragment(`INNER JOIN `, node);
        node
          .getChildrenInCategory("table")
          .forEach((c) => process.generateNode(c));
        process.addConvertedFragment(` ON `, node);
        node
          .getChildrenInCategory("on")
          .forEach((c) => process.generateNode(c));
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "innerJoinUsing",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        const tableIntro = node.children["table"][0];
        const usingExpr = node.children["using"][0];

        process.addConvertedFragment(`INNER JOIN `, node);
        process.generateNode(tableIntro);
        process.addConvertedFragment(` USING `, node);
        process.generateNode(usingExpr);

        return [];
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "from",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        process.addConvertedFragment(`FROM `, node);

        node.getChildrenInCategory("tables").forEach((c, idx, arr) => {
          process.generateNode(c);
          if (idx != arr.length - 1) {
            process.addConvertedFragment(", ", node);
          }
        });

        node.getChildrenInCategory("joins").forEach((c) => {
          process.addConvertedFragment("\n\t", node);
          process.generateNode(c);
        });
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "where",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        const expressions = node.getChildrenInCategory("expressions");
        const head = expressions[0];
        const tail = expressions.slice(1);

        process.addConvertedFragment(`WHERE `, node);
        if (head) {
          process.generateNode(head);
        }

        tail.forEach((c) => {
          process.addConvertedFragment("\n\t", node);
          process.generateNode(c);
        });
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "whereAdditional",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        const op = node.properties["operator"];
        const expr = node.children["expression"][0];

        process.addConvertedFragment(op.toUpperCase() + " ", node);
        if (expr) {
          process.generateNode(expr);
        }
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "groupBy",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        process.addConvertedFragment(`GROUP BY `, node);

        node.getChildrenInCategory("expressions").forEach((c, idx, arr) => {
          process.generateNode(c);
          if (idx != arr.length - 1) {
            process.addConvertedFragment(", ", node);
          }
        });
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "orderBy",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        process.addConvertedFragment(`ORDER BY `, node);

        node.getChildrenInCategory("expressions").forEach((c, idx, arr) => {
          process.generateNode(c);
          if (idx != arr.length - 1) {
            process.addConvertedFragment(", ", node);
          }
        });
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "sortOrder",
    },
    converter: {
      init: function (node: SyntaxNode, process: CodeGeneratorProcess<{}>) {
        process.generateNode(node.getChildrenInCategory("expression")[0]);
        process.addConvertedFragment(" " + node.properties.order, node);
      },
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "querySelect",
    },
    converter: {
      init: generateComponents,
    },
  },
  {
    type: {
      languageName: "sql",
      typeName: "queryDelete",
    },
    converter: {
      init: generateComponents,
    },
  },
];
