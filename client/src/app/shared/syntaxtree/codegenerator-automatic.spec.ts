import { SyntaxTree } from "./syntaxtree";
import { CodeGenerator } from "./codegenerator";
import { NamedLanguages, VisualisedLanguages } from "./grammar.description";

describe(`Automatic code generation`, () => {
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

    const g = new CodeGenerator([], types, "legacy");

    expect(g.hasImplicitConverter({ languageName: "l", typeName: "r" })).toBe(
      true
    );

    const t = new SyntaxTree({
      language: "l",
      name: "r",
    });

    const res = g.emit(t);
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

    const g = new CodeGenerator([], types, "legacy");

    expect(g.hasImplicitConverter({ languageName: "l", typeName: "r" })).toBe(
      true
    );

    const t = new SyntaxTree({
      language: "l",
      name: "r",
    });

    const res = g.emit(t);
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

    const g = new CodeGenerator([], types, "legacy");

    it(`isDefined`, () => {
      expect(g.hasImplicitConverter({ languageName: "l", typeName: "r" })).toBe(
        true
      );
    });

    it(`with present property at runtime`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        properties: {
          p1: "v1",
        },
      });

      const res = g.emit(t);
      expect(res).toEqual("v1");
    });

    it(`with missing property at runtime`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      expect(() => g.emit(t)).toThrowError();
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

    const g = new CodeGenerator([], types, "legacy");

    it(`isDefined`, () => {
      expect(g.hasImplicitConverter({ languageName: "l", typeName: "r" })).toBe(
        true
      );
    });

    it(`with present property at runtime`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        properties: {
          p1: "v1",
        },
      });

      const res = g.emit(t);
      expect(res).toEqual("v1");
    });

    it(`with missing property at runtime`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      expect(() => g.emit(t)).toThrowError();
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

    const g = new CodeGenerator([], types, "legacy");

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

      const res = g.emit(t);
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

    const g = new CodeGenerator([], types, "legacy");

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

      const res = g.emit(t);
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

    const g = new CodeGenerator([], types, "legacy");

    it(`empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      const res = g.emit(t);
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

      const res = g.emit(t);
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

      const res = g.emit(t);
      expect(res).toEqual("t1t1");
    });
  });

  describe(`sequence with spacing tags`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            { type: "terminal", symbol: "L" },
            {
              type: "sequence",
              name: "a1",
              tags: ["space-around"],
              nodeTypes: [{ occurs: "*", nodeType: "t1" }],
            },
            { type: "terminal", symbol: "R" },
          ],
        },
        t1: {
          type: "concrete",
          attributes: [{ type: "terminal", symbol: "t1" }],
        },
      },
    };

    const g = new CodeGenerator([], types, "legacy");

    it(`emits nothing for an empty group`, () => {
      const t = new SyntaxTree({ language: "l", name: "r" });
      expect(g.emit(t)).toEqual("LR");
    });

    it(`wraps the whole group once`, () => {
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
      expect(g.emit(t)).toEqual("L t1t1 R");
    });
  });

  describe(`facing separator tags`, () => {
    const emit = (types: NamedLanguages | VisualisedLanguages, tree: {}) =>
      new CodeGenerator([], types, "legacy").emit(new SyntaxTree(tree as any));

    it(`merges a space-after terminal with a space-before terminal`, () => {
      const types: NamedLanguages = {
        l: {
          r: {
            type: "concrete",
            attributes: [
              { type: "terminal", symbol: "a", tags: ["space-after"] },
              { type: "terminal", symbol: "b", tags: ["space-before"] },
            ],
          },
        },
      };

      expect(emit(types, { language: "l", name: "r" })).toEqual("a b");
    });

    it(`merges a space-after terminal with a space-before property`, () => {
      const types: NamedLanguages = {
        l: {
          r: {
            type: "concrete",
            attributes: [
              { type: "terminal", symbol: "a", tags: ["space-after"] },
              {
                type: "property",
                name: "name",
                base: "string",
                tags: ["space-before"],
              },
            ],
          },
        },
      };

      expect(
        emit(types, {
          language: "l",
          name: "r",
          properties: { name: "b" },
        })
      ).toEqual("a b");
    });

    it(`merges a space-after terminal with a space-before interpolate`, () => {
      const types: VisualisedLanguages = {
        l: {
          r: {
            type: "visualise",
            attributes: [
              { type: "terminal", symbol: "a", tags: ["space-after"] },
              { type: "interpolate", name: "name", tags: ["space-before"] },
            ],
          },
        },
      };

      expect(
        emit(types, {
          language: "l",
          name: "r",
          properties: { name: "b" },
        })
      ).toEqual("a b");
    });

    it(`merges two space-around child groups into one space`, () => {
      const types: NamedLanguages = {
        l: {
          r: {
            type: "concrete",
            attributes: [
              {
                type: "sequence",
                name: "left",
                tags: ["space-around"],
                nodeTypes: ["ta"],
              },
              {
                type: "sequence",
                name: "right",
                tags: ["space-around"],
                nodeTypes: ["tb"],
              },
            ],
          },
          ta: {
            type: "concrete",
            attributes: [{ type: "terminal", symbol: "a" }],
          },
          tb: {
            type: "concrete",
            attributes: [{ type: "terminal", symbol: "b" }],
          },
        },
      };

      expect(
        emit(types, {
          language: "l",
          name: "r",
          children: {
            left: [{ language: "l", name: "ta" }],
            right: [{ language: "l", name: "tb" }],
          },
        })
      ).toEqual("a b");
    });

    it(`merges a between space-after with the next child's space-before`, () => {
      const types: NamedLanguages = {
        l: {
          r: {
            type: "concrete",
            attributes: [
              {
                type: "sequence",
                name: "items",
                nodeTypes: [{ occurs: "+", nodeType: "t" }],
                between: {
                  type: "terminal",
                  symbol: ",",
                  tags: ["space-after"],
                },
              },
            ],
          },
          t: {
            type: "concrete",
            attributes: [
              { type: "terminal", symbol: "x", tags: ["space-before"] },
            ],
          },
        },
      };

      expect(
        emit(types, {
          language: "l",
          name: "r",
          children: {
            items: [
              { language: "l", name: "t" },
              { language: "l", name: "t" },
            ],
          },
        })
      ).toEqual("x, x");
    });

    it(`merges a space-after terminal with a space-before inside a horizontal container`, () => {
      const types: NamedLanguages = {
        l: {
          r: {
            type: "concrete",
            attributes: [
              { type: "terminal", symbol: "return", tags: ["space-after"] },
              {
                type: "container",
                orientation: "horizontal",
                children: [
                  { type: "terminal", symbol: "x", tags: ["space-before"] },
                ],
              },
            ],
          },
        },
      };

      expect(emit(types, { language: "l", name: "r" })).toEqual("return x");
    });

    it(`merges a space-after inside a horizontal container with a space-before terminal`, () => {
      const types: NamedLanguages = {
        l: {
          r: {
            type: "concrete",
            attributes: [
              {
                type: "container",
                orientation: "horizontal",
                children: [
                  { type: "terminal", symbol: "f", tags: ["space-after"] },
                ],
              },
              { type: "terminal", symbol: "(", tags: ["space-before"] },
            ],
          },
        },
      };

      expect(emit(types, { language: "l", name: "r" })).toEqual("f (");
    });

    it(`merges a newline-after terminal with a newline-before inside a horizontal container`, () => {
      const types: NamedLanguages = {
        l: {
          r: {
            type: "concrete",
            attributes: [
              { type: "terminal", symbol: "return", tags: ["newline-after"] },
              {
                type: "container",
                orientation: "horizontal",
                children: [
                  { type: "terminal", symbol: "x", tags: ["newline-before"] },
                ],
              },
            ],
          },
        },
      };

      expect(emit(types, { language: "l", name: "r" })).toEqual("return\nx");
    });

    it(`merges a newline-after inside a horizontal container with a newline-before terminal`, () => {
      const types: NamedLanguages = {
        l: {
          r: {
            type: "concrete",
            attributes: [
              {
                type: "container",
                orientation: "horizontal",
                children: [
                  { type: "terminal", symbol: "f", tags: ["newline-after"] },
                ],
              },
              { type: "terminal", symbol: "(", tags: ["newline-before"] },
            ],
          },
        },
      };

      expect(emit(types, { language: "l", name: "r" })).toEqual("f\n(");
    });

    it(`merges newline-after with newline-before`, () => {
      const types: NamedLanguages = {
        l: {
          r: {
            type: "concrete",
            attributes: [
              { type: "terminal", symbol: "a", tags: ["newline-after"] },
              { type: "terminal", symbol: "b", tags: ["newline-before"] },
            ],
          },
        },
      };

      expect(emit(types, { language: "l", name: "r" })).toEqual("a\nb");
    });

    it(`uses a single newline when a vertical container follows a newline-after`, () => {
      const types: NamedLanguages = {
        l: {
          r: {
            type: "concrete",
            attributes: [
              {
                type: "container",
                orientation: "vertical",
                children: [
                  { type: "terminal", symbol: "a", tags: ["newline-after"] },
                  { type: "terminal", symbol: "b" },
                ],
              },
            ],
          },
        },
      };

      expect(emit(types, { language: "l", name: "r" })).toEqual("a\nb");
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

    const g = new CodeGenerator([], types, "legacy");

    it(`empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      const res = g.emit(t);
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

      const res = g.emit(t);
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

      const res = g.emit(t);
      expect(res).toEqual("t1,t1");
    });
  });

  describe(`vertical container with sequence with between`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
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

    const g = new CodeGenerator([], types, "legacy");

    it(`empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      const res = g.emit(t);
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

      const res = g.emit(t);
      expect(res).toEqual("  t1");
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

      const res = g.emit(t);
      expect(res).toEqual("  t1,\n  t1");
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
              tags: ["newline-after"],
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

    const g = new CodeGenerator([], types, "legacy");

    it(`empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      const res = g.emit(t);
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

      const res = g.emit(t);
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

      const res = g.emit(t);
      expect(res).toEqual("c:\n  t1,\n  t1");
    });
  });

  describe(`vertical container with leading and following terminal sequence with between`, () => {
    const types: NamedLanguages = {
      l: {
        r: {
          type: "concrete",
          attributes: [
            {
              type: "terminal",
              symbol: "=>",
              tags: ["newline-after"],
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
              tags: ["newline-after"],
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

    const g = new CodeGenerator([], types, "legacy");

    it(`empty`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
      });

      const res = g.emit(t);
      expect(res).toEqual("=>\n<=");
    });

    it(`single child`, () => {
      const t = new SyntaxTree({
        language: "l",
        name: "r",
        children: {
          a1: [{ language: "l", name: "t1" }],
        },
      });

      const res = g.emit(t);
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

      const res = g.emit(t);
      expect(res).toEqual("=>\n  t1,\n  t1\n<=");
    });
  });
});
