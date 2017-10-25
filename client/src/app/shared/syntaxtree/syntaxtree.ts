import { NodeDescription, NodeLocation, NodeLocationStep, locateNode } from './syntaxtree.description'

export { NodeDescription, NodeLocation, NodeLocationStep };

/**
 * Used when refererring to types that are defined other languages.
 */
export interface QualifiedTypeName {
  typeName: string
  languageName: string
}

/**
 * @return True, if both parameters denote the same type.
 */
export function typenameEquals(lhs: QualifiedTypeName, rhs: QualifiedTypeName) {
  return (lhs.languageName === rhs.languageName && lhs.typeName === rhs.typeName);
}

/**
 * Properties of a node are atomic and always stored as string.
 * Certain validators may be used to check whether the string
 * contains something useful.
 */
type NodeProperties = { [propertyName: string]: string }

/**
 * Children of a node are always sorted.
 */
export type NodeChildren = { [childrenCategory: string]: Node[] }

/**
 * The core building block of the AST is this class. It contains
 * enough information to build arbitrarily structured trees. There
 * are no compile-time checks to do any kind of validation, these
 * checks can only be made at runtime.
 */
export class Node {
  private _nodeName: string;
  private _nodeLanguage: string;
  private _nodeProperties: NodeProperties;
  private _nodeChildren: NodeChildren;

  private _nodeParent: Node | Tree;

  /**
   * The constructor is responsible to transfer relevant description
   * properties and to construct any children.
   */
  constructor(desc: NodeDescription, parent: Node | Tree) {
    this._nodeName = desc.name;
    this._nodeLanguage = desc.language;
    this._nodeParent = parent;

    // We don't want any undefined fields during runtime
    this._nodeProperties = {}
    this._nodeChildren = {}

    // Load properties (if there are any)
    if (desc.properties) {
      // Make a deep copy of those properties, just in case ...
      this._nodeProperties = JSON.parse(JSON.stringify(desc.properties));
    }

    // Load children (if there are any)
    if (desc.children) {
      // Load all children in all categories
      for (let categoryName in desc.children) {
        const category = desc.children[categoryName];
        this._nodeChildren[categoryName] = category.map(childDesc => new Node(childDesc, this))
      }
    }
  }

  /**
   * @return The description of this node and all of it's properties and children.
   */
  toModel(): NodeDescription {
    // Primitive values and properties
    const toReturn: NodeDescription = {
      name: this.typeName,
      language: this.languageName,
    };

    // Carry over properties (if there are any)
    if (this.hasProperties) {
      toReturn.properties = JSON.parse(JSON.stringify(this._nodeProperties))
    }

    // Carry over children (if there are any)
    if (this.hasChildren) {
      toReturn.children = {};
      Object.entries(this._nodeChildren).forEach(([name, children]) => {
        toReturn.children[name] = children.map(child => child.toModel());
      });
    }

    return (toReturn);
  }

  /**
   * @return The name of the type this node should be validated against.
   */
  get typeName(): string {
    return (this._nodeName);
  }

  /**
   * @return The name of the language containing the type this node should be validated against.
   */
  get languageName(): string {
    return (this._nodeLanguage);
  }

  /**
   * @return The fully qualified of the type of this node.
   */
  get qualifiedName(): QualifiedTypeName {
    return ({
      typeName: this.typeName,
      languageName: this.languageName
    });
  }

  /**
   * @return All children in that category or an empty list if the category does not exist.
   */
  getChildrenInCategory(categoryName: string): Node[] {
    const result = this._nodeChildren[categoryName];
    if (result) {
      return (result);
    } else {
      return ([]);
    }
  }

  /**
   * @return The names of the available categories.
   */
  get childrenCategoryNames() {
    return (Object.keys(this._nodeChildren));
  }

  /**
   * @return True if this node has any children in any category
   */
  get hasChildren() {
    const categories = Object.values(this._nodeChildren);
    return (categories.some(c => c.length > 0));
  }

  /**
   * @return All children in all categories.
   */
  get children() {
    return (this._nodeChildren);
  }

  /**
   * @return True if this node has any properties.
   */
  get hasProperties() {
    return (Object.keys(this._nodeProperties).length > 0);
  }

  /**
   * @return All properties with keys and values.
   */
  get properties(): NodeProperties {
    return (this._nodeProperties);
  }

  /**
   * @return The node parenting this one.
   */
  get nodeParent(): Node {
    if (this._nodeParent instanceof Node) {
      return (this._nodeParent);
    } else {
      return (undefined);
    }
  }

  /**
   * @return The tree this node is a part of.
   */
  get tree(): Tree {
    let p: any = this._nodeParent;
    while (p && !(p instanceof Tree)) {
      p = p._nodeParent;
    }

    if (p instanceof Tree) {
      return (p);
    } else {
      return (undefined);
    }
  }

  /**
   * @return The location of this node in the tree.
   */
  get location(): NodeLocation {
    return (this.treePathImpl([]));
  }

  /**
   * Calculates a path to this node by walking up the tree and finding out where exactly
   * in the parent the current node is stored.
   */
  private treePathImpl(prev: NodeLocation): NodeLocation {
    // The root node uses the empty path
    if (this._nodeParent instanceof Tree) {
      return (prev);
    } else {
      // Take all categories of the parent object
      const found = Object.entries(this._nodeParent.children).some(([categoryName, children]) => {
        // And look for ourself
        const childIndex = children.indexOf(this);
        if (childIndex >= 0) {
          // Update the location parameter
          prev = [[categoryName, childIndex], ...prev];
          return (true);
        } else {
          return (false);
        }
      });

      if (!found) {
        throw new Error("Node must exist in parent!")
      }

      return (this._nodeParent.treePathImpl(prev));
    }
  }
}

/**
 * Acts as a "virtual" element above the root to ease manipulations
 * of syntaxtrees.
 */
export class Tree {
  private _root: Node;

  constructor(rootDesc: NodeDescription) {
    if (rootDesc) {
      this._root = new Node(rootDesc, this);
    }
  }

  /**
   * @return The root for the tree.
   */
  get rootNode(): Node {
    if (this.isEmpty) {
      throw new Error("No root node available, tree is empty");
    }

    return (this._root);
  }

  /**
   * @return True if this tree is actually empty.
   */
  get isEmpty(): boolean {
    return (!this._root);
  }

  /**
   * @return The JSON description of this tree.
   */
  toModel() {
    return (this._root.toModel());
  }

  /**
   * @return The node at the given location.
   */
  locate(loc: NodeLocation): Node {
    let current: Node = this._root;
    loc.forEach(([categoryName, childIndex], i) => {
      const children = current.children[categoryName];
      if ((children && childIndex < children.length) && childIndex >= 0) {
        current = children[childIndex];
      } else {
        throw new Error(`SyntaxTree: Could not locate step ${i} of ${JSON.stringify(loc)}`);
      }
    })

    return (current);
  }

  /**
   * Returns a new tree where the node at the given location is replaced.
   *
   * @param loc The location of the node to replace.
   * @param desc The new node to insert at its place
   * @return The modified tree.
   */
  replaceNode(loc: NodeLocation, desc: NodeDescription): Tree {
    // Replacing the needs to work different because there is no parent
    // that needs a child replaced
    if (loc.length === 0) {
      return (new Tree(desc));
    }
    else {
      // Build the description of the current tree to replace the new node in it
      let newDescription = this.toModel();

      // Walking up the tree to the parent of the node to replace
      let parent = locateNode(newDescription, loc.slice(0, loc.length - 1));
      let [parentCat, parentIndex] = loc[loc.length - 1];

      // Actually replace the node and build the new tree
      parent.children[parentCat][parentIndex] = desc;
      return (new Tree(newDescription));
    }
  }

  /**
   * Returns a new three where a new node is inserted at the given location.
   *
   * @param loc The location of the insertion.
   * @param desc The node to insert
   * @return The modified tree
   */
  insertNode(loc: NodeLocation, desc: NodeDescription): Tree {
    // The root can only be replaced, not extended.
    if (loc.length === 0) {
      throw new Error(`Nothing can be appended after the root node.`);
    } else {
      // Build the description of the current tree to insert the new node in it
      let newDescription = this.toModel();

      // Walking up the tree to the parent that will contain the new node
      let parent = locateNode(newDescription, loc.slice(0, loc.length - 1));
      let [parentCat, parentIndex] = loc[loc.length - 1];

      // Create a place for children, if no children exist so far
      if (!parent.children) {
        parent.children = {};
      }

      // Create the category if it doesn't exist so far.
      if (!parent.children[parentCat]) {
        parent.children[parentCat] = [];
      }

      // Append the node in the category and build the new tree
      let cat = parent.children[parentCat];
      cat.splice(parentIndex, 0, desc);
      return (new Tree(newDescription));
    }
  }

  /**
   * Returns a new tree where the node at the given location is deleted.
   *
   * @param loc The location of the deletion.
   * @return The modified tree
   */
  deleteNode(loc: NodeLocation): Tree {
    // The root can only be replaced, not deleted.
    if (loc.length === 0) {
      return (new Tree(undefined));
    } else {
      // Build the description of the current tree to insert the new node in it
      let newDescription = this.toModel();

      // Walking up the tree to the parent that will contain the node that needs
      // to be deleted.
      let parent = locateNode(newDescription, loc.slice(0, loc.length - 1));
      let [parentCat, parentIndex] = loc[loc.length - 1];

      // Actually delete the node
      parent.children[parentCat].splice(parentIndex, 1);

      return (new Tree(newDescription));
    }
  }

  /**
   * Returns a new tree where the node at the given location has a different
   * property value.
   *
   * @param loc The location of the node to edit.
   * @param key The name of the property.
   * @param value The new value of the property.
   * @return The modified tree.
   */
  setProperty(loc: NodeLocation, key: string, value: string): Tree {
    let newDescription = this.toModel();
    let node = locateNode(newDescription, loc);

    // The property object itself might not exist
    if (!node.properties) {
      node.properties = {};
    }

    node.properties[key] = value;

    return (new Tree(newDescription));
  }

  /**
   * Adds a new property without specifying a value.
   *
   * @param loc The location of the node to edit.
   * @param key The name of the property.
   * @return The modified tree.
   */
  addProperty(loc: NodeLocation, key: string): Tree {
    let newDescription = this.toModel();
    let node = locateNode(newDescription, loc);

    if (node.properties && key in node.properties) {
      throw new Error(`Can not add property "${key}" at ${JSON.stringify(loc)}: Name already exists`);
    } else {
      return (this.setProperty(loc, key, ""));
    }
  }

  /**
   * Returns a new tree where the given property has been renamed.
   *
   * @param loc The location of the node to edit.
   * @param key The name of the property.
   * @param newKey The new name of the property.
   * @return The modified tree.
   */
  renameProperty(loc: NodeLocation, key: string, newKey: string): Tree {
    let newDescription = this.toModel();
    let node = locateNode(newDescription, loc);

    if (!node.properties || !node.properties[key]) {
      throw new Error(`Could not rename property "${key}" at ${JSON.stringify(loc)}: Doesn't exist`);
    }

    if (newKey in node.properties) {
      throw new Error(`Could not rename property "${key}" to "${newKey}" at ${JSON.stringify(loc)}: New name exists`);
    }

    node.properties[newKey] = node.properties[key];
    delete node.properties[key];

    return (new Tree(newDescription));
  }

  /**
   * Returns a new tree where an empty childgroup has been added.
   *
   * @param loc The location of the node to edit.
   * @param key The name of the child group.
   * @return The modified tree.
   */
  addChildGroup(loc: NodeLocation, key: string): Tree {
    let newDescription = this.toModel();
    let node = locateNode(newDescription, loc);

    if (!node.children) {
      node.children = {};
    }

    if (key in node.children) {
      throw new Error(`Could not add child group "${key}" at ${JSON.stringify(loc)}: Name exists`);
    }

    node.children[key] = [];

    return (new Tree(newDescription));
  }
}
