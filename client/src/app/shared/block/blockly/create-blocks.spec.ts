import { GrammarDocument } from "../../syntaxtree";

import { createBlocksFromGrammar } from "./create-blocks";

describe(`Blockly: CreateBlocks`, () => {
  const grammar = (tags?: string[]): GrammarDocument => ({
    types: {
      l: {
        stmt: {
          type: "concrete",
          attributes: [
            { type: "terminal", symbol: "return" },
            {
              type: "sequence",
              name: "value",
              tags,
              nodeTypes: ["expr"],
            },
          ],
        },
        expr: {
          type: "concrete",
          attributes: [],
        },
      },
    },
    foreignTypes: {},
    visualisations: {},
    foreignVisualisations: {},
  });

  const stmtMessage = (tags?: string[]) => {
    const stmt = createBlocksFromGrammar(grammar(tags)).find(
      (b) => b.type === "l.stmt"
    );
    return stmt.message0;
  };

  it(`leaves a child group unspaced`, () => {
    expect(stmtMessage()).toEqual("return%1");
  });

  it(`inserts a space before a child group`, () => {
    expect(stmtMessage(["space-before"])).toEqual("return %1");
  });

  it(`inserts a space after a child group`, () => {
    expect(stmtMessage(["space-after"])).toEqual("return%1 ");
  });

  it(`inserts a space around a child group`, () => {
    expect(stmtMessage(["space-around"])).toEqual("return %1 ");
  });
});
