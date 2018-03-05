import { NodeConverterRegistration, CodeGeneratorProcess, OutputSeparator } from '../codegenerator'
import { Node } from '../syntaxtree'

function generateComponents(node: Node, process: CodeGeneratorProcess) {
  const componentNames = ["insert", "select", "update", "delete", "from", "where", "groupBy"];
  const components = componentNames
    .map(n => node.children[n])
    .filter(c => !!c)
    .map(c => c[0])
    .filter(c => !!c)

  components.forEach(n => {
    process.generateNode(n)
    process.addConvertedFragment("", node, OutputSeparator.NEW_LINE_AFTER);
  });

  return ([]);
}

/**
 * Converts an SQL-AST to a properly indented SQL query.
 */
export const NODE_CONVERTER: NodeConverterRegistration[] = [
  {
    type: {
      languageName: "sql",
      typeName: "columnName"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        const columnName = node.properties["columnName"];
        const refTableName = node.properties["refTableName"];

        if (refTableName) {
          process.addConvertedFragment(`${refTableName}.${columnName}`, node)
        } else {
          process.addConvertedFragment(columnName, node)
        }
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "constant"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        const value = node.properties["value"];
        if (isNaN(parseFloat(value))) {
          // The value is not a number, put in in quotes
          process.addConvertedFragment(`'${value}'`, node)
        } else {
          // The value is a number, it does not need quotes
          process.addConvertedFragment(value, node);
        }
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "parameter"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        const name = node.properties["name"];
        process.addConvertedFragment(`:${name}`, node);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "starOperator"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        process.addConvertedFragment("*", node)
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "functionCall"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        process.addConvertedFragment(node.properties["name"], node);
        process.addConvertedFragment("(", node);
        node.getChildrenInCategory("arguments").forEach((a, idx, arr) => {
          process.generateNode(a);
          if (idx != arr.length - 1) {
            process.addConvertedFragment(', ', node);
          }
        });
        process.addConvertedFragment(")", node);

        return ([]);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "relationalOperator"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        const operator = node.properties["operator"]
        process.addConvertedFragment(operator, node)
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "binaryExpression"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        process.addConvertedFragment("(", node);
        node.getChildrenInCategory("lhs").forEach(c => process.generateNode(c))
        process.addConvertedFragment(" ", node);
        node.getChildrenInCategory("operator").forEach(c => process.generateNode(c))
        process.addConvertedFragment(" ", node);
        node.getChildrenInCategory("rhs").forEach(c => process.generateNode(c))
        process.addConvertedFragment(")", node);

        return ([]);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "expression"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        const expr = node.getChildrenInCategory("expression");
        expr.forEach(e => process.generateNode(e));

        return ([]);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "select"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        process.addConvertedFragment(`SELECT `, node)

        const distinct = node.properties['distinct'];
        if (distinct && distinct.toLowerCase() === "true") {
          process.addConvertedFragment(`DISTINCT `, node)
        }

        node.getChildrenInCategory("columns").forEach((c, idx, arr) => {
          process.generateNode(c);
          if (idx != arr.length - 1) {
            process.addConvertedFragment(', ', node);
          }
        });

        return ([]);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "tableIntroduction"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        const name = node.properties["name"];
        const alias = node.properties["alias"];
        if (alias) {
          process.addConvertedFragment(`${name} ${alias}`, node)
        } else {
          process.addConvertedFragment(name, node)
        }
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "crossJoin"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        process.addConvertedFragment(`JOIN `, node);
        node.getChildrenInCategory("table").forEach(c => process.generateNode(c))

        return ([]);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "innerJoinOn"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        process.addConvertedFragment(`INNER JOIN `, node)
        node.getChildrenInCategory("table").forEach(c => process.generateNode(c))
        process.addConvertedFragment(` ON `, node)
        node.getChildrenInCategory("on").forEach(c => process.generateNode(c))

        return ([]);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "innerJoinUsing"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        const tableIntro = node.children['table'][0];
        const usingExpr = node.children['using'][0];

        process.addConvertedFragment(`INNER JOIN `, node)
        process.generateNode(tableIntro);
        process.addConvertedFragment(` USING `, node)
        process.generateNode(usingExpr);

        return ([]);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "from"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        process.addConvertedFragment(`FROM `, node)

        node.getChildrenInCategory("tables").forEach((c, idx, arr) => {
          process.generateNode(c);
          if (idx != arr.length - 1) {
            process.addConvertedFragment(', ', node);
          }
        });


        node.getChildrenInCategory("joins").forEach((c, idx, arr) => {
          process.addConvertedFragment('\n\t', node);
          process.generateNode(c);
        });

        return ([]);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "where"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        const expressions = node.children['expressions'];
        const head = expressions[0];
        const tail = expressions.slice(1);

        process.addConvertedFragment(`WHERE `, node)
        if (head) {
          process.generateNode(head);
        }

        tail.forEach((c, idx, arr) => {
          process.addConvertedFragment('\n\t', node);
          process.generateNode(c);
        });

        return ([]);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "whereAdditional"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        const op = node.properties['operator'];
        const expr = node.children['expression'][0];

        process.addConvertedFragment(op.toUpperCase() + ' ', node);
        process.generateNode(expr);

        return ([]);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "groupBy"
    },
    converter: {
      init: function(node: Node, process: CodeGeneratorProcess) {
        process.addConvertedFragment(`GROUP BY `, node)

        node.getChildrenInCategory("expressions").forEach((c, idx, arr) => {
          process.generateNode(c);
          if (idx != arr.length - 1) {
            process.addConvertedFragment(', ', node);
          }
        });

        return ([]);
      }
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "querySelect",
    },
    converter: {
      init: generateComponents
    }
  },
  {
    type: {
      languageName: "sql",
      typeName: "queryDelete"
    },
    converter: {
      init: generateComponents
    }
  }
];
