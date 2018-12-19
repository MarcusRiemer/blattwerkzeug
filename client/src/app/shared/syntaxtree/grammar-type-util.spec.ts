import { GrammarDescription } from "./grammar.description";
import { orderTypes, ensureTypename } from "./grammar-type-util";

describe(`Grammar Type Utilities`, () => {
  describe(`ensureTypename`, () => {
    it(`strings`, () => {
      expect(ensureTypename("t", "g")).toEqual({ languageName: "g", typeName: "t" });
    });

    it(`Qualified Typenames`, () => {
      expect(ensureTypename({ languageName: "g", typeName: "t" }, "unused"))
        .toEqual({ languageName: "g", typeName: "t" });
    });

    it(`Child cardinalities`, () => {
      expect(ensureTypename({ nodeType: { languageName: "g", typeName: "t" }, occurs: "+" }, "unused"))
        .toEqual({ languageName: "g", typeName: "t" });
    });
  });

  describe(`orderTypes`, () => {
    it(`Unknown Root`, () => {
      const g: GrammarDescription = {
        id: undefined,
        name: "foo",
        programmingLanguageId: undefined,
        root: "r",
        types: {
          "t1": {
            type: "concrete",
            attributes: []
          }
        }
      };

      const r = orderTypes(g);
      expect(r).toEqual([
        { languageName: "foo", typeName: "t1" }
      ]);
    });

    it(`Only Root`, () => {
      const g: GrammarDescription = {
        id: undefined,
        name: "foo",
        programmingLanguageId: undefined,
        root: "r",
        types: {
          "r": {
            type: "concrete",
            attributes: []
          }
        }
      };

      const r = orderTypes(g);
      expect(r).toEqual([
        { languageName: "foo", typeName: "r" }
      ]);
    });

    it(`Root and one unreferenced type`, () => {
      const g: GrammarDescription = {
        id: undefined,
        name: "foo",
        programmingLanguageId: undefined,
        root: "r",
        types: {
          "r": {
            type: "concrete",
            attributes: []
          },
          "t1": {
            type: "concrete",
            attributes: []
          }
        }
      };

      const r = orderTypes(g);
      expect(r).toEqual([
        { languageName: "foo", typeName: "r" },
        { languageName: "foo", typeName: "t1" }
      ]);
    });

    it(`Root and one unreferenced type (order flipped)`, () => {
      const g: GrammarDescription = {
        id: undefined,
        name: "foo",
        programmingLanguageId: undefined,
        root: "r",
        types: {
          "t1": {
            type: "concrete",
            attributes: []
          },
          "r": {
            type: "concrete",
            attributes: []
          }
        }
      };

      const r = orderTypes(g);
      expect(r).toEqual([
        { languageName: "foo", typeName: "r" },
        { languageName: "foo", typeName: "t1" }
      ]);
    });


    it(`Root and one illegal reference`, () => {
      const g: GrammarDescription = {
        id: undefined,
        name: "foo",
        programmingLanguageId: undefined,
        root: "r",
        types: {
          "r": {
            type: "concrete",
            attributes: [
              { type: "sequence", name: "n", nodeTypes: ["illegal"] }
            ]
          },
          "t1": {
            type: "concrete",
            attributes: []
          }
        }
      };

      const r = orderTypes(g);
      expect(r).toEqual([
        { languageName: "foo", typeName: "r" },
        { languageName: "foo", typeName: "illegal" },
        { languageName: "foo", typeName: "t1" }
      ]);
    });

    it(`Root and multiple references to the same thing`, () => {
      const g: GrammarDescription = {
        id: undefined,
        name: "foo",
        programmingLanguageId: undefined,
        root: "r",
        types: {
          "r": {
            type: "concrete",
            attributes: [
              { type: "sequence", name: "fst", nodeTypes: ["t1"] },
              { type: "allowed", name: "snd", nodeTypes: ["t1", "t1"] }
            ]
          },
          "t1": {
            type: "concrete",
            attributes: []
          }
        }
      };

      const r = orderTypes(g);
      expect(r).toEqual([
        { languageName: "foo", typeName: "r" },
        { languageName: "foo", typeName: "t1" }
      ]);
    });

    it(`Root and recursive reference to self`, () => {
      const g: GrammarDescription = {
        id: undefined,
        name: "foo",
        programmingLanguageId: undefined,
        root: "r",
        types: {
          "r": {
            type: "concrete",
            attributes: [
              { type: "choice", name: "fst", choices: ["t1"] }
            ]
          },
          "t1": {
            type: "concrete",
            attributes: [
              { type: "allowed", name: "fst", nodeTypes: ["r"] }
            ]
          }
        }
      };

      const r = orderTypes(g);
      expect(r).toEqual([
        { languageName: "foo", typeName: "r" },
        { languageName: "foo", typeName: "t1" }
      ]);
    });

    it(`Root and typedef`, () => {
      const g: GrammarDescription = {
        id: undefined,
        name: "foo",
        programmingLanguageId: undefined,
        root: "r",
        types: {
          "t1": {
            type: "oneOf",
            oneOf: ["t2", "t3"]
          },
          "t3": {
            type: "concrete",
            attributes: []
          },
          "t2": {
            type: "concrete",
            attributes: []
          },
          "r": {
            type: "concrete",
            attributes: [
              { type: "choice", name: "fst", choices: ["t1"] }
            ]
          }
        }
      };

      const r = orderTypes(g);
      expect(r).toEqual([
        { languageName: "foo", typeName: "r" },
        { languageName: "foo", typeName: "t1" },
        { languageName: "foo", typeName: "t2" },
        { languageName: "foo", typeName: "t3" }
      ]);
    });

    it(`Root and recursive typedef`, () => {
      const g: GrammarDescription = {
        id: undefined,
        name: "foo",
        programmingLanguageId: undefined,
        root: "r",
        types: {
          "t1": {
            type: "oneOf",
            oneOf: ["t2", "t3", "t1", "r"]
          },
          "t3": {
            type: "concrete",
            attributes: []
          },
          "t2": {
            type: "concrete",
            attributes: []
          },
          "r": {
            type: "concrete",
            attributes: [
              { type: "choice", name: "fst", choices: ["t1"] }
            ]
          }
        }
      };

      const r = orderTypes(g);
      expect(r).toEqual([
        { languageName: "foo", typeName: "r" },
        { languageName: "foo", typeName: "t1" },
        { languageName: "foo", typeName: "t2" },
        { languageName: "foo", typeName: "t3" }
      ]);
    });

    it(`Root typedef with bizarre order`, () => {
      const g: GrammarDescription = {
        id: undefined,
        name: "foo",
        programmingLanguageId: undefined,
        root: "r",
        types: {
          "r": {
            type: "oneOf",
            oneOf: ["t3", "t1", "t2"]
          },
          "t2": {
            type: "concrete",
            attributes: []
          },
          "t3": {
            type: "concrete",
            attributes: []
          },
          "t1": {
            type: "concrete",
            attributes: []
          }
        }
      };

      const r = orderTypes(g);
      expect(r).toEqual([
        { languageName: "foo", typeName: "r" },
        { languageName: "foo", typeName: "t3" },
        { languageName: "foo", typeName: "t1" },
        { languageName: "foo", typeName: "t2" }
      ]);
    });


    it(`Root, one chain and unreferenced item`, () => {
      const g: GrammarDescription = {
        id: undefined,
        name: "foo",
        programmingLanguageId: undefined,
        root: "r",
        types: {
          "b4": {
            type: "concrete",
            attributes: []
          },
          "r": {
            type: "concrete",
            attributes: [
              { type: "sequence", name: "n", nodeTypes: ["t1"] }
            ]
          },
          "unref": {
            type: "concrete"
          },
          "a2": {
            type: "concrete",
            attributes: [
              { type: "allowed", name: "n", nodeTypes: ["z3"] }
            ]
          },
          "t1": {
            type: "concrete",
            attributes: [
              { type: "choice", name: "n", choices: ["a2"] }
            ]
          },
          "z3": {
            type: "concrete",
            attributes: [
              { type: "sequence", name: "n", nodeTypes: ["b4"] }
            ]
          }
        }
      };

      const r = orderTypes(g);
      expect(r).toEqual([
        { languageName: "foo", typeName: "r" },
        { languageName: "foo", typeName: "t1" },
        { languageName: "foo", typeName: "a2" },
        { languageName: "foo", typeName: "z3" },
        { languageName: "foo", typeName: "b4" },
        { languageName: "foo", typeName: "unref" },
      ]);
    });
  });
});