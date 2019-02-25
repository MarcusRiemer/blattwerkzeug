import * as Schema from './grammar.description'
import * as AST from './syntaxtree'
import { Validator } from './validator'
import { ErrorCodes } from './validation-result'
import { NodePropertyIntegerValidator } from '.';

/**
 * Describes a language where each document would be the equivalent
 * to something like
 * <html>
 *   <head></head>
 *   <body>
 *     <h1 id="the-only">Heading</h1>
 *     <p class="foo bar">Paragraph 1</p>
 *     <p class="hello world">Paragraph 2</p>
 *   </body>
 * </html>
 */
const langMiniHtml: Schema.GrammarDescription = {
  id: "39e9249c-0807-489c-9ba0-48df9be23d65",
  programmingLanguageId: "spec",
  name: "mini-html",
  technicalName: "mini-html",
  types: {
    "text": {
      type: "concrete",
      attributes: [
        {
          name: "text",
          type: "property",
          base: "string",
        }
      ]
    },
    "html": {
      type: "concrete",
      attributes: [
        {
          name: "children",
          type: "sequence",
          nodeTypes: ["head", "body"]
        }
      ]
    },
    "head": {
      type: "concrete",
      attributes: [
        {
          name: "children",
          type: "allowed",
          nodeTypes: [
            {
              nodeType: "text",
              occurs: "*"
            }
          ]
        }
      ]
    },
    "body": {
      type: "concrete",
      attributes: [
        {
          name: "children",
          type: "allowed",
          nodeTypes: [
            {
              nodeType: "paragraph",
              occurs: "*"
            },
            {
              nodeType: "heading",
              occurs: "*"
            }
          ]
        }
      ]
    },
    "paragraph": {
      type: "concrete",
      attributes: [
        {
          name: "attributes",
          type: "allowed",
          nodeTypes: [
            {
              nodeType: "attr-class",
              occurs: "?"
            }
          ]
        },
        {
          name: "children",
          type: "allowed",
          nodeTypes: [
            {
              nodeType: "text",
              occurs: "*"
            }
          ]

        }
      ]
    },
    "heading": {
      type: "concrete",
      attributes: [
        {
          name: "attributes",
          type: "allowed",
          nodeTypes: [
            {
              nodeType: "attr-id",
              occurs: "?"
            }
          ]
        },
        {
          name: "children",
          type: "allowed",
          nodeTypes: [
            {
              nodeType: "text",
              occurs: "*"
            }
          ]

        }
      ]
    },
    "attr-class": {
      type: "concrete",
      attributes: [
        {
          name: "classes",
          type: "allowed",
          nodeTypes: [
            {
              nodeType: "text",
              occurs: "*"
            }
          ]
        }
      ]
    },
    "attr-id": {
      type: "concrete",
      attributes: [
        {
          name: "id",
          type: "property",
          base: "string"
        }
      ]
    }
  },
  root: "html"
};

/**
 * Describes a language where each query would be the equivalent
 * to something like
 *
 * SELECT
 * FROM
 * WHERE
 *
 * or
 *
 * DELETE
 * FROM
 * WHERE
 */
const langMiniSql: Schema.GrammarDescription = {
  id: "1315c639-9662-4812-8ea2-fc86334211e3",
  programmingLanguageId: "spec",
  name: "mini-sql",
  technicalName: "mini-sql",
  types: {
    "root": {
      type: "oneOf",
      oneOf: ["query-select", "query-delete"]
    },
    "select": { type: "concrete" },
    "delete": { type: "concrete" },
    "from": { type: "concrete" },
    "where": { type: "concrete" },
    "query-select": {
      type: "concrete",
      attributes: [
        {
          name: "children",
          type: "sequence",
          nodeTypes: ["select", "from", "where"]
        }
      ]
    },
    "query-delete": {
      type: "concrete",
      attributes: [
        {
          name: "children",
          type: "sequence",
          nodeTypes: ["delete", "from", "where"]
        }
      ]
    }
  },
  root: "root"
}

/**
 * A single node that uses every possible string constraint.
 */
const langStringConstraint: Schema.GrammarDescription = {
  id: "26cb7725-1d99-4619-8610-5ede65d3de2c",
  programmingLanguageId: "spec",
  name: "string-constraint",
  technicalName: "string-constraint",
  types: {
    root: {
      type: "concrete",
      attributes: [
        {
          name: "len",
          type: "property",
          base: "string",
          restrictions: [
            { type: "length", value: 1 }
          ]
        },
        {
          name: "min",
          type: "property",
          base: "string",
          restrictions: [
            { type: "minLength", value: 2 }
          ]
        },
        {
          name: "max",
          type: "property",
          base: "string",
          restrictions: [
            { type: "maxLength", value: 2 }
          ]
        },
        {
          name: "enum",
          type: "property",
          base: "string",
          restrictions: [
            {
              type: "enum",
              value: ["a", "b", "c"]
            }
          ]
        },
        {
          name: "regex",
          type: "property",
          base: "string",
          restrictions: [
            {
              type: "regex",
              value: "^[a-zA-Z][a-zA-Z0-9_]*$"
            }
          ]
        }
      ]
    }
  },
  root: "root"
}

/**
 * A single node that uses every possible integer constraint.
 */
const langIntegerConstraint: Schema.GrammarDescription = {
  id: "72d22bc7-22eb-4df3-a2de-1d3f601cd469",
  programmingLanguageId: "spec",
  name: "integer-constraint",
  technicalName: "integer-constraint",
  types: {
    root: {
      type: "concrete",
      attributes: [
        {
          name: "minInclusive",
          type: "property",
          base: "integer",
          restrictions: [
            { type: "minInclusive", value: 1 }
          ]
        },
        {
          name: "maxInclusive",
          type: "property",
          base: "integer",
          restrictions: [
            { type: "maxInclusive", value: 1 }
          ]
        }
      ]
    }
  },
  root: "root"
}

/**
 * A single root node that uses some children with the "allowed" constraint
 */
const langAllowedConstraint: Schema.GrammarDescription = {
  id: "f9acff60-cf3e-471e-b058-8c0d7e296386",
  programmingLanguageId: "spec",
  name: "allowed-constraint",
  technicalName: "allowed-constraint",
  types: {
    "root": {
      type: "concrete",
      attributes: [
        {
          name: "nodes",
          type: "allowed",
          nodeTypes: [
            {
              nodeType: "a",
              occurs: "*"
            },
            {
              nodeType: "b",
              occurs: {
                minOccurs: 0,
                maxOccurs: 2
              }
            },
            {
              nodeType: "c",
              occurs: "1"
            }
          ]
        }
      ],
    },
    "a": { type: "concrete" },
    "b": { type: "concrete" },
    "c": { type: "concrete" }
  },
  root: "root"
}

/**
 * A single root node that uses some children with the "sequence" constraint
 */
const langSingleSequenceConstraint: Schema.GrammarDescription = {
  id: "51a1230d-38d1-41a3-ad2e-16f2b3253b8f",
  programmingLanguageId: "spec",
  name: "single-sequence-constraint",
  technicalName: "single-sequence-constraint",
  types: {
    "root": {
      type: "concrete",
      attributes: [
        {
          name: "nodes",
          type: "sequence",
          nodeTypes: ["a"]
        }
      ],
    },
    "a": { type: "concrete" }
  },
  root: "root"
};

/**
 * A single root node that uses some children with the "sequence" constraint
 */
const langSequenceConstraint: Schema.GrammarDescription = {
  id: "51a1230d-38d1-41a3-ad2e-16f2b3253b8f",
  programmingLanguageId: "spec",
  name: "sequence-constraint",
  technicalName: "sequence-constraint",
  types: {
    "root": {
      type: "concrete",
      attributes: [
        {
          name: "nodes",
          type: "sequence",
          nodeTypes: [
            "a",
            {
              nodeType: "b",
              occurs: {
                minOccurs: 0,
                maxOccurs: 2,
              }
            },
            "a",
            {
              nodeType: "c",
              occurs: {
                minOccurs: 1,
                maxOccurs: 2
              }
            }
          ]
        }
      ],
    },
    "a": { type: "concrete" },
    "b": { type: "concrete" },
    "c": { type: "concrete" }
  },
  root: "root"
};

/**
 * A single root node that uses some children with the "sequence" constraint
 */
const langOneOfNodes: Schema.GrammarDescription = {
  id: "6eb2981d-005b-43cf-918b-eced74757416",
  programmingLanguageId: "spec",
  name: "oneof-nodes",
  technicalName: "oneof-nodes",
  types: {
    "root": {
      oneOf: ["a", "b"]
    } as Schema.NodeTypeDescription,
    "a": { type: "concrete" },
    "b": { type: "concrete" },
    "c": { type: "concrete" }
  },
  root: "root"
}

/**
 * A single node with only boolean properties.
 */
const langBooleanConstraint: Schema.GrammarDescription = {
  id: "bff6b785-72c7-4a31-b08a-5855605dbb94",
  programmingLanguageId: "spec",
  name: "boolean-constraint",
  technicalName: "boolean-constraint",
  types: {
    "root": {
      type: "concrete",
      attributes: [
        {
          name: "foo",
          type: "property",
          base: "boolean",
        }
      ]
    }
  },
  root: "root"
}

/**
 * A single node that may have optional properties.
 */
const langOptionalProperty: Schema.GrammarDescription = {
  id: "caad8d21-de02-4a68-af57-75ef400ae20a",
  programmingLanguageId: "spec",
  name: "optionalProperty",
  technicalName: "optionalProperty",
  types: {
    "root": {
      type: "concrete",
      attributes: [
        {
          name: "required",
          type: "property",
          base: "string",
        },
        {
          name: "optional",
          type: "property",
          base: "string",
          isOptional: true
        }
      ]
    }
  },
  root: "root"
}

const langSimpleChoice: Schema.GrammarDescription = {
  id: "044b031e-beee-4966-8487-f67b9d1d5a77",
  programmingLanguageId: "spec",
  name: "simpleChoice",
  technicalName: "simpleChoice",
  types: {
    "root": {
      type: "concrete",
      attributes: [
        {
          name: "nodes",
          type: "choice",
          choices: ["a", "b"]
        }
      ]
    },
    "a": { type: "concrete" },
    "b": { type: "concrete" }
  },
  root: "root"
}

const langComplexChoice: Schema.GrammarDescription = {
  id: "dc7f51dc-6207-427b-b8c1-b277d0b0b478",
  programmingLanguageId: "spec",
  name: "complexChoice",
  technicalName: "complexChoice",
  types: {
    "root": {
      type: "concrete",
      attributes: [
        {
          name: "choice",
          type: "choice",
          choices: ["a", "b"]
        }
      ]
    },
    "a": {
      type: "concrete",
      attributes: [
        {
          name: "sequence",
          type: "sequence",
          nodeTypes: ["c", "c"]
        }
      ]
    },
    "b": {
      type: "concrete",
      attributes: [
        {
          name: "allowed",
          type: "allowed",
          nodeTypes: ["d", "c"]
        }
      ]
    },
    "c": { type: "concrete" },
    "d": { type: "concrete" }
  },
  root: "root"
}

describe('Grammar Validation', () => {

  describe('Property Validators', () => {
    it('Integer', () => {
      const validator = new NodePropertyIntegerValidator({
        type: "property",
        name: "int",
        base: "integer",
      });

      expect(validator.validValue("1")).toBe(true);
      expect(validator.validValue("-1")).toBe(true);
      expect(validator.validValue("0")).toBe(true);
      expect(validator.validValue("-12")).toBe(true);
      expect(validator.validValue("12")).toBe(true);

      expect(validator.validValue("")).toBe(false);
      expect(validator.validValue("-")).toBe(false);
      expect(validator.validValue("+0")).toBe(false);
      expect(validator.validValue("+0.1")).toBe(false);
      expect(validator.validValue("-0.1")).toBe(false);
      expect(validator.validValue(" 0.1")).toBe(false);
      expect(validator.validValue(" 0.1 ")).toBe(false);
      expect(validator.validValue("1 ")).toBe(false);
      expect(validator.validValue(" 1")).toBe(false);
      expect(validator.validValue(" 1 ")).toBe(false);
      expect(validator.validValue(0 as any)).toBe(false, `typeof "number"`);
    });
  });

  /*
   * This is more a compile time testcase. It ensures that the grammar
   * definition allows the definition of "empty types" without having a
   * clash between oneOf and complex types.
   */
  it('Grammar Empty Nodes', () => {
    const g: Schema.GrammarDescription = {
      id: "54e44b21-a7cb-470b-af96-19a4f5c06277",
      programmingLanguageId: "spec",
      name: "emptyNodes",
      technicalName: "emptyNodes",
      root: "r",
      types: {
        "r": { type: "concrete" }
      }
    };

    const v = new Validator([g]);

    const ast = new AST.Tree({
      language: "emptyNodes",
      name: "r"
    });

    expect(v.validateFromRoot(ast).isValid).toBe(true);
  });


  it('Empty Tree', () => {
    const v = new Validator([langStringConstraint]);

    const ast = new AST.Tree(undefined);
    const res = v.validateFromRoot(ast);
    expect(res.errors.length).toEqual(1);
    expect(res.errors[0].code).toEqual(ErrorCodes.Empty);
  });


  it('String Constraints (Valid)', () => {
    const v = new Validator([langStringConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "string-constraint",
      name: "root",
      properties: {
        "len": "1",
        "min": "12",
        "max": "12",
        "enum": "a",
        "regex": "A"
      }
    };

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(0);
  });

  it('String Constraints (Invalid)', () => {
    const v = new Validator([langStringConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "string-constraint",
      name: "root",
      properties: {
        "len": "12",
        "min": "1",
        "max": "123",
        "enum": "d",
        "regex": "_A"
      }
    };

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(5);
    expect(res.errors[0].code).toEqual(ErrorCodes.IllegalPropertyType)
    expect(res.errors[0].data.condition).toEqual("2 != 1");
    expect(res.errors[1].code).toEqual(ErrorCodes.IllegalPropertyType)
    expect(res.errors[1].data.condition).toEqual("1 < 2");
    expect(res.errors[2].code).toEqual(ErrorCodes.IllegalPropertyType)
    expect(res.errors[2].data.condition).toEqual("3 > 2");
    expect(res.errors[3].code).toEqual(ErrorCodes.IllegalPropertyType)
    expect(res.errors[3].data.condition).toEqual(`"d" in ["a","b","c"]`);
    expect(res.errors[4].code).toEqual(ErrorCodes.IllegalPropertyType)
    expect(res.errors[4].data.condition).toEqual(`"_A" did not match regular expression "^[a-zA-Z][a-zA-Z0-9_]*$"`);
  });

  it('Integer value wrongly integer', () => {
    const v = new Validator([langIntegerConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "integer-constraint",
      name: "root",
      properties: {
        "minInclusive": "1",
        "maxInclusive": "1"
      }
    };

    astDesc.properties["minInclusive"] = (1 as any);
    astDesc.properties["maxInclusive"] = ("asdf" as any);

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(2);
  });

  it('Integer Constraints (Valid)', () => {
    const v = new Validator([langIntegerConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "integer-constraint",
      name: "root",
      properties: {
        "minInclusive": "1",
        "maxInclusive": "1"
      }
    };

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors).toEqual([]);
  });

  it('Integer Constraints (Invalid)', () => {
    const v = new Validator([langIntegerConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "integer-constraint",
      name: "root",
      properties: {
        "minInclusive": "0",
        "maxInclusive": "2"
      }
    };

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(2);
  });

  it('Boolean Constraint', () => {
    const v = new Validator([langBooleanConstraint]);

    const astDescTrue: AST.NodeDescription = {
      language: "boolean-constraint",
      name: "root",
      properties: {
        "foo": "true"
      }
    };

    const astTrue = new AST.Node(astDescTrue, undefined);
    const resTrue = v.validateFromRoot(astTrue);
    expect(resTrue.isValid).toBeTruthy();

    const astDescFalse: AST.NodeDescription = {
      language: "boolean-constraint",
      name: "root",
      properties: {
        "foo": "false"
      }
    };

    const astFalse = new AST.Node(astDescFalse, undefined);
    const resFalse = v.validateFromRoot(astFalse);
    expect(resFalse.isValid).toBeTruthy();

    const astDescInvalid: AST.NodeDescription = {
      language: "boolean-constraint",
      name: "root",
      properties: {
        "foo": "foo"
      }
    };

    const astInvalid = new AST.Node(astDescInvalid, undefined);
    const resInvalid = v.validateFromRoot(astInvalid);
    expect(resInvalid.errors.length).toEqual(1)
    expect(resInvalid.errors[0].code).toEqual(ErrorCodes.IllegalPropertyType);
  });

  it('Optional property missing', () => {
    const v = new Validator([langOptionalProperty]);

    const astDesc: AST.NodeDescription = {
      language: langOptionalProperty.name,
      name: "root",
      properties: {
        "required": ""
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.isValid).toBeTruthy();
  });

  it('Required property missing', () => {
    const v = new Validator([langOptionalProperty]);

    const astDesc: AST.NodeDescription = {
      language: langOptionalProperty.name,
      name: "root",
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(1);
    expect(res.errors[0].code).toEqual(ErrorCodes.MissingProperty);
  });

  it('Invalid oneOf: oneOf node in AST', () => {
    const v = new Validator([langOneOfNodes]);

    const astDesc: AST.NodeDescription = {
      language: "oneof-nodes",
      name: "root",
    };

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(1);
    expect(res.errors[0].code).toEqual(ErrorCodes.TransientNode);
  });

  it('Invalid oneOf: No match', () => {
    const v = new Validator([langOneOfNodes]);

    const astDesc: AST.NodeDescription = {
      language: "oneof-nodes",
      name: "c",
    };

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(1);
    expect(res.errors[0].code).toEqual(ErrorCodes.UnexpectedType);
  });

  it('oneOf: allowsChildType() and validCardinality()', () => {
    const v = new Validator([langOneOfNodes]);

    const vRoot = v.availableTypes[0];
    const vNodeA = v.availableTypes[1];
    const vNodeB = v.availableTypes[2];
    const vNodeC = v.availableTypes[3];

    const tNodeA = { languageName: langOneOfNodes.name, typeName: "a" };
    const tNodeB = { languageName: langOneOfNodes.name, typeName: "b" };
    const tNodeC = { languageName: langOneOfNodes.name, typeName: "c" };
    const tNodeD = { languageName: langOneOfNodes.name, typeName: "d" };

    expect(vRoot.allowsChildType(tNodeA, "nodes")).toBeTruthy("a in root");
    expect(vRoot.allowsChildType(tNodeB, "nodes")).toBeTruthy("b in root");
    expect(vRoot.allowsChildType(tNodeC, "nodes")).toBeFalsy("c in root");
    expect(vRoot.allowsChildType(tNodeD, "nodes")).toBeFalsy("d in root");
    expect(vRoot.validCardinality("nodes")).toEqual({ minOccurs: 0, maxOccurs: 0 });

    expect(vNodeA.allowsChildType(tNodeA, "nodes")).toBe(false);
    expect(vNodeA.allowsChildType(tNodeB, "nodes")).toBe(false);
    expect(vNodeA.allowsChildType(tNodeC, "nodes")).toBe(false);
    expect(vNodeA.allowsChildType(tNodeD, "nodes")).toBe(false);
    expect(vNodeA.validCardinality("nodes")).toEqual({ minOccurs: 0, maxOccurs: 0 });

    expect(vNodeB.allowsChildType(tNodeA, "nodes")).toBe(false);
    expect(vNodeB.allowsChildType(tNodeB, "nodes")).toBe(false);
    expect(vNodeB.allowsChildType(tNodeC, "nodes")).toBe(false);
    expect(vNodeB.allowsChildType(tNodeD, "nodes")).toBe(false);
    expect(vNodeB.validCardinality("nodes")).toEqual({ minOccurs: 0, maxOccurs: 0 });

    expect(vNodeC.allowsChildType(tNodeA, "nodes")).toBe(false);
    expect(vNodeC.allowsChildType(tNodeB, "nodes")).toBe(false);
    expect(vNodeC.allowsChildType(tNodeC, "nodes")).toBe(false);
    expect(vNodeC.allowsChildType(tNodeD, "nodes")).toBe(false);
    expect(vNodeC.validCardinality("nodes")).toEqual({ minOccurs: 0, maxOccurs: 0 });
  });

  it('"sequence": validCardinality()', () => {
    const v = new Validator([langSequenceConstraint]);
    const vRoot = v.availableTypes[0];
    const vNodeA = v.availableTypes[1];
    const vNodeB = v.availableTypes[2];
    const vNodeC = v.availableTypes[3];

    expect(vRoot.validCardinality("nodes")).toEqual({ minOccurs: 3, maxOccurs: 6 });
    expect(vRoot.validCardinality("nonexistant")).toEqual({ minOccurs: 0, maxOccurs: 0 });

    expect(vNodeA.validCardinality("nonexistant")).toEqual({ minOccurs: 0, maxOccurs: 0 });
    expect(vNodeB.validCardinality("nonexistant")).toEqual({ minOccurs: 0, maxOccurs: 0 });
    expect(vNodeC.validCardinality("nonexistant")).toEqual({ minOccurs: 0, maxOccurs: 0 });
  });

  it('"sequence": allowsChildType()', () => {
    const v = new Validator([langSequenceConstraint]);
    const vRoot = v.availableTypes[0];
    const vNodeA = v.availableTypes[1];
    const vNodeB = v.availableTypes[2];
    const vNodeC = v.availableTypes[3];

    const tNodeA = { languageName: langSequenceConstraint.name, typeName: "a" };
    const tNodeB = { languageName: langSequenceConstraint.name, typeName: "b" };
    const tNodeC = { languageName: langSequenceConstraint.name, typeName: "c" };
    const tNodeD = { languageName: langSequenceConstraint.name, typeName: "d" };

    expect(vRoot.allowsChildType(tNodeA, "nodes")).toBeTruthy();
    expect(vRoot.allowsChildType(tNodeB, "nodes")).toBeTruthy();
    expect(vRoot.allowsChildType(tNodeC, "nodes")).toBeTruthy();
    expect(vRoot.allowsChildType(tNodeD, "nodes")).toBeFalsy();

    expect(vNodeA.allowsChildType(tNodeA, "nodes")).toBeFalsy();
    expect(vNodeA.allowsChildType(tNodeB, "nodes")).toBeFalsy();
    expect(vNodeA.allowsChildType(tNodeC, "nodes")).toBeFalsy();
    expect(vNodeA.allowsChildType(tNodeD, "nodes")).toBeFalsy();

    expect(vNodeB.allowsChildType(tNodeA, "nodes")).toBeFalsy();
    expect(vNodeB.allowsChildType(tNodeB, "nodes")).toBeFalsy();
    expect(vNodeB.allowsChildType(tNodeC, "nodes")).toBeFalsy();
    expect(vNodeB.allowsChildType(tNodeD, "nodes")).toBeFalsy();

    expect(vNodeC.allowsChildType(tNodeA, "nodes")).toBeFalsy();
    expect(vNodeC.allowsChildType(tNodeB, "nodes")).toBeFalsy();
    expect(vNodeC.allowsChildType(tNodeC, "nodes")).toBeFalsy();
    expect(vNodeC.allowsChildType(tNodeD, "nodes")).toBeFalsy();
  });

  it('Invalid single "sequence": Completely Empty', () => {
    const v = new Validator([langSingleSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "single-sequence-constraint",
      name: "root",
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.map(e => e.code)).toEqual([ErrorCodes.MissingChild]);
  });

  it('Invalid single "sequence": Two items', () => {
    const v = new Validator([langSingleSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "single-sequence-constraint",
      name: "root",
      children: {
        "nodes": [
          { language: "single-sequence-constraint", name: "a" },
          { language: "single-sequence-constraint", name: "a" }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.map(e => e.code)).toEqual([ErrorCodes.SuperflousChild]);
  });

  it('Invalid single "sequence": Unexpected item', () => {
    const v = new Validator([langSingleSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "single-sequence-constraint",
      name: "root",
      children: {
        "nodes": [
          { language: "single-sequence-constraint", name: "root" }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.map(e => e.code)).toEqual([ErrorCodes.IllegalChildType]);
  });

  it('Invalid "sequence": Completely Empty', () => {
    const v = new Validator([langSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "sequence-constraint",
      name: "root",
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(3);
    expect(res.errors[0].code).toEqual(ErrorCodes.MissingChild);
    expect(res.errors[0].data).toEqual({
      expected: {
        languageName: "sequence-constraint",
        typeName: "a",
      },
      index: 0,
      category: "nodes"
    });
    expect(res.errors[1].code).toEqual(ErrorCodes.MissingChild);
    expect(res.errors[1].data).toEqual({
      expected: {
        languageName: "sequence-constraint",
        typeName: "a",
      },
      index: 1,
      category: "nodes"
    });
    expect(res.errors[2].code).toEqual(ErrorCodes.MissingChild);
    expect(res.errors[2].data).toEqual({
      expected: {
        languageName: "sequence-constraint",
        typeName: "c",
      },
      index: 2,
      category: "nodes"
    });
  });

  it('Invalid "sequence": Only first required node', () => {
    const v = new Validator([langSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "sequence-constraint",
      name: "root",
      children: {
        "nodes": [
          {
            language: "sequence-constraint",
            name: "a"
          },
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(2);
    expect(res.errors[0].code).toEqual(ErrorCodes.MissingChild);
    expect(res.errors[0].data).toEqual({
      expected: {
        languageName: "sequence-constraint",
        typeName: "a"
      },
      index: 1,
      category: "nodes"
    });
    expect(res.errors[1].code).toEqual(ErrorCodes.MissingChild);
    expect(res.errors[1].data).toEqual({
      expected: {
        languageName: "sequence-constraint",
        typeName: "c"
      },
      index: 2,
      category: "nodes"
    });
  });

  it('Invalid "sequence": Only first two required nodes', () => {
    const v = new Validator([langSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "sequence-constraint",
      name: "root",
      children: {
        "nodes": [
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "a"
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(1);
    expect(res.errors[0].code).toEqual(ErrorCodes.MissingChild);
    expect(res.errors[0].data).toEqual({
      expected: {
        languageName: "sequence-constraint",
        typeName: "c"
      },
      index: 2,
      category: "nodes"
    });
  });

  it('Valid "sequence": Exact three required nodes', () => {
    const v = new Validator([langSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "sequence-constraint",
      name: "root",
      children: {
        "nodes": [
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "c"
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors).toEqual([]);
  });

  it('Valid "sequence": Three required nodes + Optional "b"-node', () => {
    const v = new Validator([langSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "sequence-constraint",
      name: "root",
      children: {
        "nodes": [
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "b"
          },
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "c"
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors).toEqual([]);
  });

  it('Valid "sequence": Three required nodes + two optional "b"-nodes', () => {
    const v = new Validator([langSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "sequence-constraint",
      name: "root",
      children: {
        "nodes": [
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "b"
          },
          {
            language: "sequence-constraint",
            name: "b"
          },
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "c"
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors).toEqual([]);
  });

  it('Valid "sequence": Three required nodes + All optional "b"- and "c"-nodes', () => {
    const v = new Validator([langSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "sequence-constraint",
      name: "root",
      children: {
        "nodes": [
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "b"
          },
          {
            language: "sequence-constraint",
            name: "b"
          },
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "c"
          },
          {
            language: "sequence-constraint",
            name: "c"
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors).toEqual([]);
  });

  it('Invalid "sequence": Three required nodes + All optional "b"- and "c"-nodes + extra node', () => {
    const v = new Validator([langSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "sequence-constraint",
      name: "root",
      children: {
        "nodes": [
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "b"
          },
          {
            language: "sequence-constraint",
            name: "b"
          },
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "c"
          },
          {
            language: "sequence-constraint",
            name: "c"
          },
          {
            language: "sequence-constraint",
            name: "a"
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.map(e => e.code)).toEqual([ErrorCodes.SuperflousChild]);
  });

  it('Invalid "sequence": Three required nodes + three optional "b"-nodes', () => {
    const v = new Validator([langSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "sequence-constraint",
      name: "root",
      children: {
        "nodes": [
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "b"
          },
          {
            language: "sequence-constraint",
            name: "b"
          },
          {
            language: "sequence-constraint",
            name: "b"
          },
          {
            language: "sequence-constraint",
            name: "a"
          },
          {
            language: "sequence-constraint",
            name: "c"
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(2);
  });

  it('"allowed": validCardinality()', () => {
    const v = new Validator([langAllowedConstraint]);
    const vRoot = v.availableTypes[0];
    const vNodeA = v.availableTypes[1];
    const vNodeB = v.availableTypes[2];
    const vNodeC = v.availableTypes[3];

    expect(vRoot.validCardinality("nodes")).toEqual({ minOccurs: 1, maxOccurs: Infinity });
    expect(vRoot.validCardinality("nonexistant")).toEqual({ minOccurs: 0, maxOccurs: 0 });

    expect(vNodeA.validCardinality("nonexistant")).toEqual({ minOccurs: 0, maxOccurs: 0 });
    expect(vNodeB.validCardinality("nonexistant")).toEqual({ minOccurs: 0, maxOccurs: 0 });
    expect(vNodeC.validCardinality("nonexistant")).toEqual({ minOccurs: 0, maxOccurs: 0 });
  });

  it('"allowed": allowsChildType', () => {
    const v = new Validator([langAllowedConstraint]);
    const vRoot = v.availableTypes[0];
    const vNodeA = v.availableTypes[1];
    const vNodeB = v.availableTypes[2];
    const vNodeC = v.availableTypes[3];

    const tNodeA = { languageName: langAllowedConstraint.name, typeName: "a" };
    const tNodeB = { languageName: langAllowedConstraint.name, typeName: "b" };
    const tNodeC = { languageName: langAllowedConstraint.name, typeName: "c" };
    const tNodeD = { languageName: langAllowedConstraint.name, typeName: "d" };

    expect(vRoot.allowsChildType(tNodeA, "nodes")).toBeTruthy("a in root");
    expect(vRoot.allowsChildType(tNodeB, "nodes")).toBeTruthy("b in root");
    expect(vRoot.allowsChildType(tNodeC, "nodes")).toBeTruthy("c in root");
    expect(vRoot.allowsChildType(tNodeD, "nodes")).toBeFalsy("d in root");

    expect(vNodeA.allowsChildType(tNodeA, "nodes")).toBe(false);
    expect(vNodeA.allowsChildType(tNodeB, "nodes")).toBe(false);
    expect(vNodeA.allowsChildType(tNodeC, "nodes")).toBe(false);
    expect(vNodeA.allowsChildType(tNodeD, "nodes")).toBe(false);

    expect(vNodeB.allowsChildType(tNodeA, "nodes")).toBe(false);
    expect(vNodeB.allowsChildType(tNodeB, "nodes")).toBe(false);
    expect(vNodeB.allowsChildType(tNodeC, "nodes")).toBe(false);
    expect(vNodeB.allowsChildType(tNodeD, "nodes")).toBe(false);

    expect(vNodeC.allowsChildType(tNodeA, "nodes")).toBe(false);
    expect(vNodeC.allowsChildType(tNodeB, "nodes")).toBe(false);
    expect(vNodeC.allowsChildType(tNodeC, "nodes")).toBe(false);
    expect(vNodeC.allowsChildType(tNodeD, "nodes")).toBe(false);
  });

  it('Invalid "allowed": Empty', () => {
    const v = new Validator([langAllowedConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "allowed-constraint",
      name: "root",
      children: {
        "nodes": []
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(1);
  });

  it('Valid "allowed": Required "c" node first', () => {
    const v = new Validator([langAllowedConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "allowed-constraint",
      name: "root",
      children: {
        "nodes": [
          {
            language: "allowed-constraint",
            name: "c"
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors).toEqual([]);
  });

  it('Valid "allowed": All allowed nodes once', () => {
    const v = new Validator([langAllowedConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "allowed-constraint",
      name: "root",
      children: {
        "nodes": [
          {
            language: "allowed-constraint",
            name: "c"
          },
          {
            language: "allowed-constraint",
            name: "b"
          },
          {
            language: "allowed-constraint",
            name: "a"
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(0);
  });

  it('Invalid "allowed": No "c" but too many "b"', () => {
    const v = new Validator([langAllowedConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "allowed-constraint",
      name: "root",
      children: {
        "nodes": [
          {
            language: "allowed-constraint",
            name: "b"
          },
          {
            language: "allowed-constraint",
            name: "b"
          },
          {
            language: "allowed-constraint",
            name: "b"
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(2);
    expect(res.errors[0].code).toEqual(ErrorCodes.InvalidMaxOccurences);
    expect(res.errors[1].code).toEqual(ErrorCodes.InvalidMinOccurences);
  });

  it('Valid Choice (simple): a', () => {
    const v = new Validator([langSimpleChoice]);

    const astDesc: AST.NodeDescription = {
      language: "simpleChoice",
      name: "root",
      children: {
        "nodes": [
          {
            language: "simpleChoice",
            name: "a"
          }
        ]
      }
    }

    const ast = new AST.Tree(astDesc)
    const res = v.validateFromRoot(ast);

    expect(res.errors).toEqual([]);
  });

  it('Valid Choice (simple): b', () => {
    const v = new Validator([langSimpleChoice]);

    const astDesc: AST.NodeDescription = {
      language: "simpleChoice",
      name: "root",
      children: {
        "nodes": [
          {
            language: "simpleChoice",
            name: "b"
          }
        ]
      }
    }

    const ast = new AST.Tree(astDesc)
    const res = v.validateFromRoot(ast);

    expect(res.errors).toEqual([]);
  });

  it('Invalid Choice (simple): c', () => {
    const v = new Validator([langSimpleChoice]);

    const astDesc: AST.NodeDescription = {
      language: "simpleChoice",
      name: "root",
      children: {
        "nodes": [
          {
            language: "simpleChoice",
            name: "c"
          }
        ]
      }
    }

    const ast = new AST.Tree(astDesc)
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(1);
    expect(res.errors[0].code).toEqual(ErrorCodes.NoChoiceMatching);
  });

  it('Valid Choice: a, but a itself is not valid', () => {
    const v = new Validator([langSimpleChoice]);

    const astDesc: AST.NodeDescription = {
      language: "simpleChoice",
      name: "root",
      children: {
        "nodes": [
          {
            language: "simpleChoice",
            name: "a",
            children: {
              "tooMuch": [

              ]
            }
          }
        ]
      }
    }

    const ast = new AST.Tree(astDesc)
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(1);
    expect(res.errors[0].code).toEqual(ErrorCodes.SuperflousChildCategory);
  });

  it('Valid Choice (complex): allowsChildType', () => {
    const v = new Validator([langComplexChoice]);

    const type_root = { languageName: "complexChoice", typeName: "root" };
    const type_a = { languageName: "complexChoice", typeName: "a" };
    const type_b = { languageName: "complexChoice", typeName: "b" };
    const type_c = { languageName: "complexChoice", typeName: "c" };
    const type_d = { languageName: "complexChoice", typeName: "d" };

    expect(v.getType(type_root).allowsChildType(type_a, "choice")).toBe(true, "root => a");
    expect(v.getType(type_root).allowsChildType(type_b, "choice")).toBe(true, "root => b");
    expect(v.getType(type_root).allowsChildType(type_c, "choice")).toBe(false, "root => c");
    expect(v.getType(type_root).allowsChildType(type_d, "choice")).toBe(false, "root => d");

    expect(v.getType(type_a).allowsChildType(type_a, "sequence")).toBe(false, "a => a");
    expect(v.getType(type_a).allowsChildType(type_b, "sequence")).toBe(false, "a => b");
    expect(v.getType(type_a).allowsChildType(type_c, "sequence")).toBe(true, "a => c");
    expect(v.getType(type_a).allowsChildType(type_d, "sequence")).toBe(false, "a => d");

    expect(v.getType(type_b).allowsChildType(type_a, "allowed")).toBe(false, "b => a");
    expect(v.getType(type_b).allowsChildType(type_b, "allowed")).toBe(false, "b => b");
    expect(v.getType(type_b).allowsChildType(type_c, "allowed")).toBe(true, "b => c");
    expect(v.getType(type_b).allowsChildType(type_d, "allowed")).toBe(true, "b => d");
  });

  it('Valid Choice (complex): sequence in a is too short', () => {
    const v = new Validator([langComplexChoice]);

    const astDesc: AST.NodeDescription = {
      language: "complexChoice",
      name: "root",
      children: {
        "choice": [
          {
            language: "complexChoice",
            name: "c"
          }
        ]
      }
    };

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);
    expect(res.errors.length).toEqual(1);
  });

  it('Validating tree of unknown language', () => {
    const v = new Validator([langAllowedConstraint, langSequenceConstraint]);

    const astDesc: AST.NodeDescription = {
      language: "nonexistant",
      name: "irrelevant",
    };

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(1);

    const err = res.errors[0];
    expect(err.code).toEqual(ErrorCodes.UnknownRootLanguage);
    expect(err.data.requiredLanguage).toEqual(astDesc.language);
    expect(err.data.availableLanguages).toEqual(["allowed-constraint", "sequence-constraint"]);
  });

  it('Mini-SQL: Empty SELECT query', () => {
    const v = new Validator([langMiniSql]);

    const astDesc: AST.NodeDescription = {
      language: "mini-sql",
      name: "query-select"
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(3, res);
    expect(res.errors[0].code).toEqual(ErrorCodes.MissingChild)
    expect(res.errors[1].code).toEqual(ErrorCodes.MissingChild)
    expect(res.errors[2].code).toEqual(ErrorCodes.MissingChild)
  });

  it('Mini-SQL: registers types', () => {
    const v = new Validator([langMiniSql]);

    expect(v.isKnownLanguage(langMiniSql.name)).toBeTruthy();
    for (let nodeName in langMiniSql.types) {
      expect(v.isKnownType(langMiniSql.name, nodeName)).toBeTruthy();
    }
  });

  it('Mini-HTML: registers types', () => {
    const v = new Validator([langMiniHtml]);

    expect(v.isKnownLanguage(langMiniHtml.name)).toBeTruthy();
    for (let nodeName in langMiniHtml.types) {
      expect(v.isKnownType(langMiniHtml.name, nodeName)).toBeTruthy();
    }
  });

  it('Mini-HTML: empty', () => {
    const v = new Validator([langMiniHtml]);
    const res = v.validateFromRoot(undefined);

    expect(res.errors.length).toEqual(1);
  });

  it('Mini-HTML: superflous children', () => {
    const v = new Validator([langMiniHtml]);

    const astDesc: AST.NodeDescription = {
      language: "mini-html",
      name: "html",
      children: {
        children: [
          { language: "mini-html", name: "head" },
          { language: "mini-html", name: "body" }
        ],
        superflous: [
          { language: "mini-html", name: "mini-html" }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);
    const res = v.validateFromRoot(ast);

    expect(res.errors.length).toEqual(1);
    expect(res.errors[0].code).toEqual(ErrorCodes.SuperflousChildCategory)
  });

  it('Mini-HTML: Empty document', () => {
    const v = new Validator([langMiniHtml]);

    const astDesc: AST.NodeDescription = {
      language: "mini-html",
      name: "html"
    }

    const ast = new AST.Node(astDesc, undefined);

    const res = v.validateFromRoot(ast);
    expect(res.errors.length).toEqual(2, res);

    expect(res.errors[0].code).toEqual(ErrorCodes.MissingChild)
    expect(res.errors[1].code).toEqual(ErrorCodes.MissingChild)
  });

  it('Mini-HTML: Minimal document', () => {
    const v = new Validator([langMiniHtml]);

    const astDesc: AST.NodeDescription = {
      language: "mini-html",
      name: "html",
      children: {
        children: [
          {
            language: "mini-html",
            name: "head",
            children: {
              children: [
                {
                  language: "mini-html",
                  name: "text",
                  properties: {
                    "text": "Minimal"
                  }
                }
              ]
            }
          },
          { language: "mini-html", name: "body" }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);

    const res = v.validateFromRoot(ast);
    expect(res.errors.length).toEqual(0, res);
  });

  it('Mini-HTML: Heading and paragraph', () => {
    const v = new Validator([langMiniHtml]);

    const astDesc: AST.NodeDescription = {
      language: "mini-html",
      name: "html",
      children: {
        children: [
          { language: "mini-html", name: "head" },
          {
            language: "mini-html",
            name: "body",
            children: {
              children: [
                {
                  language: "mini-html",
                  name: "heading"
                },
                {
                  language: "mini-html",
                  name: "paragraph"
                }
              ]
            }
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);

    const res = v.validateFromRoot(ast);
    expect(res.errors.length).toEqual(0, res);
  });

  it('Mini-HTML: Invalid body (HTML again)', () => {
    const v = new Validator([langMiniHtml]);

    const astDesc: AST.NodeDescription = {
      language: "mini-html",
      name: "html",
      children: {
        children: [
          { language: "mini-html", name: "head" },
          {
            language: "mini-html",
            name: "body",
            children: {
              children: [
                {
                  language: "mini-html",
                  name: "html"
                }
              ]
            }
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);

    const res = v.validateFromRoot(ast);
    expect(res.errors.length).toEqual(1, res);
    expect(res.errors[0].code).toEqual(ErrorCodes.IllegalChildType);
    expect(JSON.stringify(res.errors[0].data)).toBeTruthy("Should be pure data");
  });

  it('Mini-HTML: Invalid single child (SQL query)', () => {
    const v = new Validator([langMiniHtml, langMiniSql]);

    const astDesc: AST.NodeDescription = {
      language: "mini-html",
      name: "html",
      children: {
        children: [
          {
            language: "mini-sql",
            name: "query-select"
          }
        ]
      }
    }

    const ast = new AST.Node(astDesc, undefined);

    const res = v.validateFromRoot(ast);
    expect(res.isValid).toBeFalsy();
    expect(res.errors.length).toEqual(2);
    expect(res.errors[0].code).toEqual(ErrorCodes.IllegalChildType);
    expect(JSON.stringify(res.errors[0].data)).toBeTruthy("Should be pure data");
    expect(res.errors[1].code).toEqual(ErrorCodes.MissingChild);
    expect(JSON.stringify(res.errors[1].data)).toBeTruthy("Should be pure data");
  });
});
