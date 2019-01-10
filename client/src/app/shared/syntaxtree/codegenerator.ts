import { Node, Tree, QualifiedTypeName } from './syntaxtree'

export enum OutputSeparator {
  NONE,
  SPACE_BEFORE,
  SPACE_AFTER,
  NEW_LINE_BEFORE,
  NEW_LINE_AFTER
}

/**
 * Represents a node that has been compiled into its string
 * representation.
 */
interface GeneratedNode {
  depth: number;
  compilation: string;
  node: Node;
  sep: OutputSeparator
}

/**
 * Bundles data that is collected during code generation.
 */
export class CodeGeneratorProcess {
  private _generated: GeneratedNode[] = [];
  private _generator: CodeGenerator;
  private _currentDepth: number = 0;

  constructor(generator: CodeGenerator) {
    this._generator = generator;
  }

  /**
   * Adds some compiled node to the current result.
   */
  addConvertedFragment(compilation: string, node: Node, sep = OutputSeparator.NONE) {
    this._generated.push({
      depth: this._currentDepth,
      compilation: compilation,
      node: node,
      sep: sep
    });
  }

  /**
   * Executes the given function in a context where every call to `addConvertedFragment`
   * is done at an extra level of indentation.
   */
  indent(indentedCalls: () => void) {
    this._currentDepth++;
    indentedCalls();
    this._currentDepth--;
  }

  /**
   * Generates code for the given node
   */
  generateNode(node: Node) {
    if (!node) {
      throw new Error("Can't generate node for falsy value");
    }

    const converter = this._generator.getConverter(node.qualifiedName);
    const bodyCategories = converter.init(node, this) || node.childrenCategoryNames;

    // Iterate over all children that should be emitted
    bodyCategories.forEach(categoryName => {
      node.getChildrenInCategory(categoryName).forEach(child => {
        this.generateNode(child)
      });
    });

    // Possibly finish generation
    if (converter.finish) {
      converter.finish(node, this);
    }
  }

  emit(): string {
    // First and last separators are sometimes irrelevant, all
    // other elements need the appropriate separation characters
    const first = this._generated[0];
    const last = this._generated[this._generated.length - 1];

    // Picks the correct separation character and position
    const sepChar = (gen: GeneratedNode, i: number) => {
      // The final separation character may change under various circumstances (read on)
      let finalSep = gen.sep;

      // Are these first or last elements with irrelevant separators?
      const firstBefore = gen == first
        && (gen.sep == OutputSeparator.NEW_LINE_BEFORE || gen.sep == OutputSeparator.SPACE_BEFORE);
      const lastAfter = gen == last
        && (gen.sep == OutputSeparator.NEW_LINE_AFTER || gen.sep == OutputSeparator.SPACE_AFTER)
      if (firstBefore || lastAfter) {
        finalSep = OutputSeparator.NONE;
      }

      // Does the seperator match the previous separator?
      if (i > 0 && finalSep != OutputSeparator.NONE) {
        let prevSep = this._generated[i - 1].sep;
        // Would this loead to two newlines?
        const doubleNewline = prevSep == OutputSeparator.NEW_LINE_AFTER && finalSep == OutputSeparator.NEW_LINE_BEFORE;
        // Or to two spaces?
        const doubleSpace = prevSep == OutputSeparator.SPACE_AFTER && finalSep == OutputSeparator.SPACE_BEFORE;

        // In that case we disregard this separator
        if (doubleNewline || doubleSpace) {
          finalSep = OutputSeparator.NONE;
        }
      }

      // Applying the separator and possibly indentation (for newlines)
      switch (finalSep) {
        case OutputSeparator.NEW_LINE_BEFORE: return "\n" + gen.compilation;
        case OutputSeparator.NEW_LINE_AFTER: return gen.compilation + "\n";
        case OutputSeparator.SPACE_BEFORE: return " " + gen.compilation;
        case OutputSeparator.SPACE_AFTER: return gen.compilation + " ";
        case OutputSeparator.NONE: return gen.compilation;
      }
    }

    const INDENT = '  '; // The string that is used to indent stuff
    const indent = (fragment: string, i: number, all: string[]) => {
      if (fragment.startsWith("\n")) {
        // Insert indentation characters after newline
        return ("\n" + INDENT.repeat(this._generated[i].depth) + fragment.substring(1));
      }
      else if (fragment.endsWith("\n") && (i + 1 < all.length)) {
        // Insert indentation characters for the next element after newline
        return (fragment + INDENT.repeat(this._generated[i + 1].depth));
      } else {
        return (fragment);
      }
    };

    return (
      this._generated
        .map(sepChar)
        .map(indent)
        .join("")
    );
  }
}

/**
 * Controls how a node is converted to text and what the children
 * have to do with it.
 */
export interface NodeConverter {
  /*
   * This function is called when the node is entered. Because
   * languages like XML need to render some special children,
   * namingly their attributes, before the actual children, some
   * children may be rendered as part of this step. To ensure
   * that these children are not re-rendered as part of the body,
   * this function should explicitly return the children to render
   * as part of the body.
   *
   * @return A list of categories. The categories in this list
   *         will be processed as part of the body of this node.
   *         If the return value is `undefined` all children
   *         will be processed as part of the body.
   */
  init(node: Node, process: CodeGeneratorProcess): (string[] | void);

  /**
   * A possibility to close any unfinished business from the
   * init-function.
   */
  finish?: (node: Node, process: CodeGeneratorProcess) => void;

}

/**
 * Used to register a NodeConverter for a certain type.
 */
export interface NodeConverterRegistration {
  converter: NodeConverter,
  type: QualifiedTypeName
}

/**
 * Registers callbacks per language per type.
 */
type RegisteredCallbacks = { [langName: string]: { [typeName: string]: NodeConverter } };

/**
 * Transforms an AST into its compiled string representation.
 */
export class CodeGenerator {

  private _callbacks: RegisteredCallbacks = {};

  constructor(converters: NodeConverterRegistration[]) {
    converters.forEach(c => this.registerConverter(c.type, c.converter));
  }

  /**
   * Registers a new converter for a certain type. Currently
   * duplicate converters are not allowed, so it is not possible
   * to unintentionally overwrite already registered convertes.
   */
  private registerConverter(t: QualifiedTypeName, converter: NodeConverter) {
    if (this.hasConverter(t)) {
      throw new Error(`There is already a converter for "${t.languageName}.${t.typeName}"`);
    } else {
      if (!this._callbacks[t.languageName]) {
        this._callbacks[t.languageName] = {};
      }
      this._callbacks[t.languageName][t.typeName] = converter;
    }
  }

  /**
   * @param ast The tree to emit.
   */
  emit(ast: Node | Tree): string {
    let rootNode: Node = undefined;

    if (ast instanceof Tree && !ast.isEmpty) {
      rootNode = ast.rootNode;
    } else if (ast instanceof Node) {
      rootNode = ast;
    }

    if (rootNode) {
      const process = new CodeGeneratorProcess(this);
      process.generateNode(rootNode);

      return (process.emit());
    } else {
      throw new Error("Attempted to generate code for empty tree");
    }
  }

  /**
   * @return True if there is a converter for the given type.
   */
  hasConverter(t: QualifiedTypeName) {
    return !!(this._callbacks[t.languageName] && this._callbacks[t.languageName][t.typeName]);
  }

  /**
   * @return A converter for the type in question.
   */
  getConverter(t: QualifiedTypeName) {
    if (!this._callbacks[t.languageName]) {
      throw new Error(`Language "${t.languageName}" is unknown to CodeGenerator, available languages are: [${Object.keys(this._callbacks).join(", ")}]`);
    }

    if (!this._callbacks[t.languageName][t.typeName]) {
      throw new Error(`Type "${t.languageName}.${t.typeName}" is unknown to CodeGenerator`);
    }

    return (this._callbacks[t.languageName][t.typeName]);
  }

}
