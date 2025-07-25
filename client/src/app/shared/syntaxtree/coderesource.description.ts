import { ProjectResourceDescription } from "../resource.description";

import { NodeDescription } from "./syntaxtree.description";

/**
 * A resource that is described by a syntaxtree.
 */
export interface CodeResourceDescription extends ProjectResourceDescription {
  // The tree that describes the code of this resource.
  ast?: NodeDescription;

  // The actual programming language this resource uses.
  programmingLanguageId: string;

  // The block language this resource uses
  blockLanguageId: string;

  // The task the user has to solve
  assignment?: string;
}

// Only used to allow a `null` ast (which indicates deletion)
interface CodeResourceUpdateDescription extends CodeResourceDescription {
  ast: null | NodeDescription;
}

/**
 * A request to update a code resource. May omit values to be updated
 * and may explicitly set the ast to `null` which will delete it.
 */
export interface CodeResourceRequestUpdateDescription {
  resource: Partial<
    Omit<CodeResourceUpdateDescription, "id" | "createdAt" | "updatedAt">
  >;
}
