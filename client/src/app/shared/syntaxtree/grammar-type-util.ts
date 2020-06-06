import * as Desc from "./grammar.description";
import { QualifiedTypeName } from "./syntaxtree.description";
import { FullNodeConcreteTypeDescription } from "./grammar-type-util.description";

/**
 * If no name is provided: Generates a name based on a running number and the type.
 */
export function ensureAttributeName(
  desc: Desc.NodeAttributeDescription,
  i: number,
  path: string[]
) {
  const printedPath = path.length > 0 ? path.join("_") + "_" : "";
  return desc.name || `${printedPath}${desc.type}_${i}`;
}

/**
 * Constructs a new grammar where attributes in the given grammar are guarenteed to be named.
 */
export function ensureGrammarAttributeNames(
  desc: Desc.GrammarDocument
): Desc.GrammarDocument {
  const copy: Desc.GrammarDocument = JSON.parse(JSON.stringify(desc));

  const impl = (
    attributes: Desc.NodeAttributeDescription[],
    path: string[]
  ) => {
    attributes.forEach((a, i) => {
      a.name = ensureAttributeName(a, i, path);

      if (a.type === "container") {
        impl(a.children, path.concat(a.name));
      }
    });
  };

  Object.values(copy.types).forEach((n) => {
    Object.values(n).forEach((t) => {
      if (t.type === "concrete" && t.attributes) {
        impl(t.attributes, []);
      }
    });
  });

  return copy;
}

/**
 * A NodeAttributeDescription that knows the name of its hosting grammar and
 * the type it is placed on.
 */
export type FullNodeAttributeDescription = Desc.NodeAttributeDescription & {
  languageName: string;
  typeName: string;
};

/**
 * @return All attributes of the given grammar in the form of a handy list.
 */
export function getFullQualifiedAttributes(
  g: Desc.GrammarDocument
): FullNodeAttributeDescription[] {
  const toReturn: FullNodeAttributeDescription[] = [];
  const namedGrammar = ensureGrammarAttributeNames(g);

  const recurseAttribute = (
    t: QualifiedNodeTypeDescription,
    a: Desc.NodeAttributeDescription
  ) => {
    toReturn.push(
      Object.assign({}, a, {
        languageName: t.languageName,
        typeName: t.typeName,
      })
    );

    if (a.type === "container") {
      a.children.forEach((c) => recurseAttribute(t, c));
    }
  };

  getQualifiedTypes(namedGrammar).forEach((t) => {
    if (Desc.isNodeConcreteTypeDescription(t)) {
      (t.attributes || []).forEach((attribute) => {
        recurseAttribute(t, attribute);
      });
    }
  });

  return toReturn;
}

/**
 * A predicate with a NodeTypeDescription as argument
 */
type NodeTypeDescriptionPredicate = (t: Desc.NodeTypeDescription) => boolean;

/**
 * @return Names of all types in the given grammar in the form of a handy list
 */
function collectTypes(
  g: Desc.GrammarDocument,
  pred: NodeTypeDescriptionPredicate
): QualifiedTypeName[] {
  const toReturn: QualifiedTypeName[] = [];

  if (!g) {
    return [];
  }

  const allTypes = allPresentTypes(g);

  Object.entries(allTypes).forEach(([languageName, types]) => {
    Object.entries(types).forEach(([typeName, type]) => {
      if (pred(type)) {
        toReturn.push({
          languageName: languageName,
          typeName: typeName,
        });
      }
    });
  });

  return toReturn;
}

/**
 * @return Names of all types in the given grammar in the form of a handy list
 */
export function getAllTypes(g: Desc.GrammarDocument): QualifiedTypeName[] {
  return collectTypes(g, (_) => true);
}

/**
 * @return Names of all concrete types in the given grammar in the form of a handy list
 */
export function getConcreteTypes(g: Desc.GrammarDocument): QualifiedTypeName[] {
  return collectTypes(g, Desc.isNodeConcreteTypeDescription);
}

/**
 * A NodeAttributeDescription that knows the name of its hosting grammar and
 * the type it is placed on.
 */
export type QualifiedNodeTypeDescription = Desc.NodeTypeDescription & {
  languageName: string;
  typeName: string;
};

/**
 * @return All attributes of the given grammar in the form of a handy list.
 */
export function getQualifiedTypes(
  g: Desc.GrammarDocument
): QualifiedNodeTypeDescription[] {
  const toReturn: QualifiedNodeTypeDescription[] = [];

  const allTypes = allPresentTypes(g);

  Object.entries(allTypes).forEach(([langName, types]) => {
    Object.entries(types).forEach(([typeName, t]) => {
      toReturn.push(
        Object.assign({}, t, {
          languageName: langName,
          typeName: typeName,
        })
      );
    });
  });

  return toReturn;
}

/**
 * Calculates the self contained, full description for a certain node type.
 */
export function fullNodeDescription(
  grammar: Desc.GrammarDocument,
  typeName: QualifiedTypeName
): FullNodeConcreteTypeDescription;
export function fullNodeDescription(
  grammar: Desc.GrammarDocument,
  typeName: string,
  languageName: string
): FullNodeConcreteTypeDescription;
export function fullNodeDescription(
  grammar: Desc.GrammarDocument,
  typeName: string | QualifiedTypeName,
  languageName?: string
): FullNodeConcreteTypeDescription {
  if (typeof typeName === "object") {
    languageName = typeName.languageName;
    typeName = typeName.typeName;
  }

  const actualLang = grammar.types[languageName];
  if (!actualLang) {
    throw new Error(`Language "${languageName}" does not exist on grammar`);
  }

  const actualType = actualLang[typeName];
  if (!actualType) {
    throw new Error(`Type "${typeName}" does not exist on grammar`);
  }

  if (actualType.type !== "concrete") {
    throw new Error(`Type "${typeName}" is not a concrete type`);
  }

  return {
    type: actualType.type,
    attributes: actualType.attributes,
    languageName: languageName,
    typeName: typeName,
  };
}

/**
 * @return A fully qualified typename, even if the input was a reference.
 */
export const ensureTypename = (
  ref: Desc.TypeReference | Desc.ChildCardinalityDescription,
  grammarName: string
): QualifiedTypeName => {
  if (Desc.isQualifiedTypeName(ref)) {
    return ref;
  } else if (Desc.isChildCardinalityDescription(ref)) {
    return ensureTypename(ref.nodeType, grammarName);
  } else {
    return { languageName: grammarName, typeName: ref };
  }
};

export type OrderedTypes = QualifiedTypeName[];

/**
 *
 */
export function stableQualifiedTypename(n: QualifiedTypeName): string {
  return n.languageName + "." + n.typeName;
}

/**
 * @return A meaningful order of the types in the given grammar
 */
export function orderTypes(g: Desc.GrammarDocument): OrderedTypes {
  // Is there a root to work with
  const rootLang = g.root && g.types[g.root.languageName];

  // Ordering should work over all types in the document, not
  // just the local types
  const allTypes = allPresentTypes(g);

  if (!rootLang || !rootLang[g.root.typeName]) {
    // No root available? We just return the order that we got
    const toReturn: OrderedTypes = [];
    Object.entries(allTypes).forEach(([langName, types]) => {
      Object.keys(types).forEach((typeName) => {
        toReturn.push({ languageName: langName, typeName: typeName });
      });
    });

    return toReturn;
  } else {
    const usedTypes = new Set<string>();
    const order: OrderedTypes = [];

    // Forward declaration
    let recurseType: (curr: QualifiedTypeName) => void = undefined;

    const handleAttribute = (
      a: Desc.NodeAttributeDescription,
      currLanguageName: string
    ) => {
      switch (a.type) {
        case "allowed":
        case "sequence":
          a.nodeTypes.forEach((t) => {
            recurseType(ensureTypename(t, currLanguageName));
          });
          break;
        case "choice":
          a.choices.forEach((t) => {
            recurseType(ensureTypename(t, currLanguageName));
          });
          break;
        case "container":
          a.children.forEach((t) => {
            handleAttribute(t, currLanguageName);
          });
          break;
      }
    };

    // Recursively walk through all types that are mentioned
    recurseType = (curr: QualifiedTypeName) => {
      // Don't do anything if the type has been mentioned already
      if (!usedTypes.has(stableQualifiedTypename(curr))) {
        usedTypes.add(stableQualifiedTypename(curr));
        order.push(curr);

        // Different types need to be treated differently
        const types = allTypes[curr.languageName];
        if (types && types[curr.typeName]) {
          const def = types[curr.typeName];
          switch (def.type) {
            // For concrete types: Add all types mentioned in childgroups
            case "concrete":
              (def.attributes || []).forEach((a) =>
                handleAttribute(a, curr.languageName)
              );
              break;
            case "oneOf":
              (def.oneOf || []).forEach((t) =>
                recurseType(ensureTypename(t, curr.languageName))
              );
              break;
          }
        }
      }
    };

    recurseType(g.root);

    // Add all unreferenced types
    const unreferenced = getQualifiedTypes(g)
      // OUCH! Order of keys is important here, if "typeName" is mentioned first
      // the resulting string also has that key and value mentioned first
      .map(
        (t): QualifiedTypeName => {
          return { languageName: t.languageName, typeName: t.typeName };
        }
      )
      .filter((t) => !usedTypes.has(stableQualifiedTypename(t)));
    order.push(...unreferenced);

    return order;
  }
}

export function allPresentTypes(g: Desc.GrammarDocument): Desc.NamedLanguages {
  const allLangKeys = new Set([
    ...Object.keys(g.types ?? []),
    ...Object.keys(g.foreignTypes ?? []),
  ]);

  const toReturn: Desc.NamedLanguages = {};

  allLangKeys.forEach((lang) => {
    toReturn[lang] = Object.assign(
      {},
      g.foreignTypes[lang] ?? {},
      g.types[lang] ?? {}
    );
  });

  return toReturn;
}
