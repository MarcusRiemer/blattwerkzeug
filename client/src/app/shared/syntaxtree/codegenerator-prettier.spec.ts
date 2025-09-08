import { doc } from "prettier";
import {
  hasAnyNonWhitespace,
  isPrettierLine,
  prettierCodeGeneratorFromGrammar,
} from "./codegenerator-prettier";
import { NamedLanguages, VisualisedLanguages } from "./grammar.description";
import { SyntaxTree } from "./syntaxtree";

fdescribe(`Prettier code generator`, () => {
  describe(`Prettier utilities`, () => {
    describe(`isPrettierLine`, () => {
      it(`hardline`, () => {
        expect(isPrettierLine(doc.builders.hardline)).toBeTrue();
      });
    });
    describe(`hasAnyPrettierTerminal`, () => {
      it(`hardline`, () => {
        expect(hasAnyNonWhitespace([doc.builders.hardline])).toBeFalse();
      });

      it(`"a" + hardline`, () => {
        expect(hasAnyNonWhitespace(["a", doc.builders.hardline])).toBeTrue();
      });

      it(`" " + hardline`, () => {
        expect(hasAnyNonWhitespace([" ", doc.builders.hardline])).toBeFalse();
      });

      it(`group(hardline)`, () => {
        expect(
          hasAnyNonWhitespace([doc.builders.group(doc.builders.hardline)])
        ).toBeFalse();
      });

      it(`concat(hardline)`, () => {
        expect(
          hasAnyNonWhitespace([doc.builders.concat([doc.builders.hardline])])
        ).toBeFalse();
      });

      it(`{ "type": "concat", "parts": [""] },`, () => {
        expect(
          hasAnyNonWhitespace([doc.builders.concat([""])])
        ).toBeFalse()
      })
    });
  });

  describe(`Sanity Check Prettier Codegen`, () => {
    const pp = (tree: doc.builders.Doc): string => {
      return doc.printer.printDocToString(tree, {
        embeddedInHtml: false,
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
      }).formatted;
    };

    it(`Indent with terminal before`, () => {
      const tree = doc.builders.concat([
        "root:",
        doc.builders.indent(
          doc.builders.concat([
            doc.builders.hardline,
            doc.builders.join(doc.builders.hardline, ["a", "b"]),
          ])
        ),
      ]);

      expect(pp(tree)).toEqual("root:\n  a\n  b");
    });

    it(`Indent without terminal before`, () => {
      const tree = doc.builders.concat([
        doc.builders.indent(
          doc.builders.concat([
            doc.builders.hardline,
            doc.builders.join(doc.builders.hardline, ["a", "b"]),
          ])
        ),
      ]);

      expect(pp(tree)).toEqual("\n  a\n  b");
    });
  });

  it(`Single terminal`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "root",
            },
          ],
        },
      },
    };

    const t = new SyntaxTree({
      language: "l",
      name: "r",
    });

    const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
    expect(res).toEqual("root");
  });

  it(`two terminals`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "1",
            },
            {
              type: "terminal",
              symbol: "2",
            },
          ],
        },
      },
    };

    const t = new SyntaxTree({
      language: "l",
      name: "r",
    });

    const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
    expect(res).toEqual("12");
  });

  describe(`single property`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "property",
              name: "p1",
              base: "string",
            },
          ],
        },
      },
    };

    it(`with present property at runtime`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        properties: {
          p1: "v1",
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("v1");
    });

    it(`with missing property at runtime`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      expect(() =>
        prettierCodeGeneratorFromGrammar(types, t.rootNode)
      ).toThrowError();
    });
  });

  describe(`single interpolation`, () => {
    const types: VisualisedLanguages = {
      l: {
        r: {
          type: "visualise",
          attributes: [
            {
              type: "interpolate",
              name: "p1",
            },
          ],
        },
      },
    };

    it(`with present property at runtime`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        properties: {
          p1: "v1",
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("v1");
    });

    it(`with missing property at runtime`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      expect(() =>
        prettierCodeGeneratorFromGrammar(types, t.rootNode)
      ).toThrowError();
    });
  });

  describe(`interpolation and terminal with spaces`, () => {
    const types: VisualisedLanguages = {
      l: {
        r: {
          type: "visualise",
          attributes: [
            {
              type: "interpolate",
              name: "p1",
            },
            {
              type: "interpolate",
              name: "p2",
              tags: ["space-before"],
            },
            {
              type: "interpolate",
              name: "p3",
              tags: ["space-after"],
            },
            {
              type: "interpolate",
              name: "p4",
            },
          ],
        },
      },
    };

    it(`with present property at runtime`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        properties: {
          p1: "v1",
          p2: "v2",
          p3: "v3",
          p4: "v4",
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("v1 v2v3 v4");
    });
  });

  describe(`interpolation and terminal with spacing around and quotation`, () => {
    const types: VisualisedLanguages = {
      l: {
        r: {
          type: "visualise",
          attributes: [
            {
              type: "interpolate",
              name: "p1",
            },
            {
              type: "interpolate",
              name: "p2",
              tags: ["space-around", "double-quote"],
            },
            {
              type: "interpolate",
              name: "p3",
            },
          ],
        },
      },
    };

    it(`with present property at runtime`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        properties: {
          p1: "v1",
          p2: "v2",
          p3: "v3",
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual(`v1 "v2" v3`);
    });
  });

  describe(`sequence`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "sequence",
              name: "a1",
              nodeTypes: ["t1"],
            },
          ],
        },
        t1: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "t1",
            },
          ],
        },
      },
    };

    it(`empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("");
    });

    it(`single child`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          a1: [{ language: "l", name: "t1" }],
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("t1");
    });

    it(`two children`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          a1: [
            { language: "l", name: "t1" },
            { language: "l", name: "t1" },
          ],
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("t1t1");
    });
  });

  describe(`sequence with between`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "sequence",
              name: "a1",
              nodeTypes: [
                {
                  occurs: "*",
                  nodeType: "t1",
                },
              ],
              between: {
                type: "terminal",
                symbol: ",",
              },
            },
          ],
        },
        t1: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "t1",
            },
          ],
        },
      },
    };

    it(`empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("");
    });

    it(`single child`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          a1: [{ language: "l", name: "t1" }],
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("t1");
    });

    it(`two children`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          a1: [
            { language: "l", name: "t1" },
            { language: "l", name: "t1" },
          ],
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("t1,t1");
    });
  });

  describe(`vertical container with two child groups`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "container",
              orientation: "vertical",
              children: [
                {
                  type: "sequence",
                  name: "a1",
                  nodeTypes: [
                    {
                      occurs: "*",
                      nodeType: "t1",
                    },
                  ],
                  between: {
                    type: "terminal",
                    symbol: ";",
                  },
                },
                {
                  type: "sequence",
                  name: "a2",
                  nodeTypes: [
                    {
                      occurs: "*",
                      nodeType: "t2",
                    },
                  ],
                  between: {
                    type: "terminal",
                    symbol: ";",
                  },
                },
              ],
            },
          ],
        },
        t1: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "t1",
            },
          ],
        },
        t2: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "t2",
            },
          ],
        },
      },
    };

    it(`empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("");
    });

    it(`first group: single child, second group: empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          "a1": [
            { language: "l", name: "t1" }
          ],
          "a2": []
        }
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("t1");
    });

    it(`first group: two children, second group: empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          "a1": [
            { language: "l", name: "t1" },
            { language: "l", name: "t1" }
          ],
          "a2": []
        }
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("t1;t1");
    });
  })

  describe(`vertical container with sequence with between`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "container",
              orientation: "vertical",
              children: [
                {
                  type: "sequence",
                  name: "a1",
                  nodeTypes: [
                    {
                      occurs: "*",
                      nodeType: "t1",
                    },
                  ],
                  between: {
                    type: "terminal",
                    symbol: "#",
                  },
                },
              ],
            },
          ],
        },
        t1: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "t1",
            },
          ],
        },
      },
    };

    it(`empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("");
    });

    it(`single child`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          a1: [{ language: "l", name: "t1" }],
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("t1");
    });

    it(`two children`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          a1: [
            { language: "l", name: "t1" },
            { language: "l", name: "t1" },
          ],
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("t1#t1");
    });
  });

  describe(`vertical container with leading terminal sequence with between`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "c:",
            },
            {
              type: "container",
              orientation: "vertical",
              tags: ["indent"],
              children: [
                {
                  type: "sequence",
                  name: "a1",
                  nodeTypes: [
                    {
                      occurs: "*",
                      nodeType: "t1",
                    },
                  ],
                  between: {
                    type: "terminal",
                    symbol: ",",
                  },
                },
              ],
            },
          ],
        },
        t1: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "t1",
            },
          ],
        },
      },
    };

    it(`empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("c:");
    });

    it(`single child`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          a1: [{ language: "l", name: "t1" }],
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("c:\n  t1");
    });

    it(`two children`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          a1: [
            { language: "l", name: "t1" },
            { language: "l", name: "t1" },
          ],
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("c:\n  t1,t1");
    });
  });

  describe(`vertical container with leading and following terminal sequence with between`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "container",
              orientation: "vertical",
              children: [
                {
                  type: "terminal",
                  symbol: "=>",
                },
                {
                  type: "container",
                  orientation: "vertical",
                  tags: ["indent"],
                  children: [
                    {
                      type: "sequence",
                      name: "a1",
                      nodeTypes: [
                        {
                          occurs: "*",
                          nodeType: "t1",
                        },
                      ],
                      between: {
                        type: "terminal",
                        symbol: ",",
                      },
                    },
                  ],
                },
                {
                  type: "terminal",
                  symbol: "<=",
                },
              ],
            },
          ],
        },
        t1: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "t1",
            },
          ],
        },
      },
    };

    it(`empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("=>\n<=");
    });

    xit(`single child`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          a1: [{ language: "l", name: "t1" }],
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("=>\n  t1\n<=");
    });

    it(`two children`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          a1: [
            { language: "l", name: "t1" },
            { language: "l", name: "t1" },
          ],
        },
      });

      const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
      expect(res).toEqual("=>\n  t1,\n  t1\n<=");
    });
  });

  it(`vertical container with nothing but terminals `, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "container",
              orientation: "vertical",
              children: [
                {
                  type: "terminal",
                  symbol: "1",
                },
                {
                  type: "terminal",
                  symbol: "2",
                },
                {
                  type: "terminal",
                  symbol: "3",
                },
              ],
            },
          ],
        },
      },
    };

    const t = new SyntaxTree({
      language: "l",
      name: "r",
    });

    const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
    expect(res).toEqual("1\n2\n3");
  });

  it(`Block with nothing but terminals `, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "1",
            },
            {
              type: "terminal",
              symbol: "2",
            },
            {
              type: "terminal",
              symbol: "3",
            },
          ],
        },
      },
    };

    const t = new SyntaxTree({
      language: "l",
      name: "r",
    });

    const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
    expect(res).toEqual("123");
  });

  it(`Vertical container with terminals and horizontal containers`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "container",
              orientation: "vertical",
              children: [
                {
                  type: "container",
                  orientation: "horizontal",
                  children: [
                    {
                      type: "terminal",
                      symbol: "l1-1",
                    },
                    {
                      type: "terminal",
                      symbol: "l1-2",
                      tags: ["space-around"],
                    },
                    {
                      type: "terminal",
                      symbol: "l1-3",
                    },
                  ],
                },

                {
                  type: "terminal",
                  symbol: "l2-1",
                },
                {
                  type: "terminal",
                  symbol: "l2-2",
                },
                {
                  type: "terminal",
                  symbol: "l2-3",
                },
                {
                  type: "container",
                  orientation: "horizontal",
                  children: [
                    {
                      type: "terminal",
                      symbol: "l3-1",
                    },
                    {
                      type: "terminal",
                      symbol: "l3-2",
                      tags: ["space-around"],
                    },
                    {
                      type: "terminal",
                      symbol: "l3-3",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const t = new SyntaxTree({
      language: "l",
      name: "r",
    });

    const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
    expect(res).toEqual("l1-1 l1-2 l1-3\nl2-1\nl2-2\nl2-3\nl3-1 l3-2 l3-3");
  });

  it(`Vertical container with indented terminals and horizontal containers`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "container",
              orientation: "vertical",
              children: [
                {
                  type: "container",
                  orientation: "horizontal",
                  children: [
                    {
                      type: "terminal",
                      symbol: "l1-1",
                    },
                    {
                      type: "terminal",
                      symbol: "l1-2",
                      tags: ["space-around"],
                    },
                    {
                      type: "terminal",
                      symbol: "l1-3",
                    },
                  ],
                },
                {
                  type: "container",
                  orientation: "vertical",
                  children: [
                    {
                      type: "terminal",
                      symbol: "l2-1",
                    },
                    {
                      type: "terminal",
                      symbol: "l2-2",
                    },
                    {
                      type: "terminal",
                      symbol: "l2-3",
                    },
                  ],
                  tags: ["indent"],
                },
                {
                  type: "container",
                  orientation: "horizontal",
                  children: [
                    {
                      type: "terminal",
                      symbol: "l3-1",
                    },
                    {
                      type: "terminal",
                      symbol: "l3-2",
                      tags: ["space-around"],
                    },
                    {
                      type: "terminal",
                      symbol: "l3-3",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const t = new SyntaxTree({
      language: "l",
      name: "r",
    });

    const res = prettierCodeGeneratorFromGrammar(types, t.rootNode);
    expect(res).toEqual(
      "l1-1 l1-2 l1-3\n  l2-1\n  l2-2\n  l2-3\nl3-1 l3-2 l3-3"
    );
  });
});
