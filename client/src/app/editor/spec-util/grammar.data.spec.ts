import { TestBed } from "@angular/core/testing";
import { ApolloTestingController } from "apollo-angular/testing";

import { FullGrammarDocument } from "../../../generated/graphql";

import { GrammarDescription } from "../../shared/";
import { generateUUIDv4 } from "../../shared/util-browser";
import { ResourceReferencesService } from "src/app/shared/resource-references.service";
import {
  cacheFullGrammar,
  FullGrammar,
} from "../../shared/serverdata/gql-cache";
import { Apollo } from "apollo-angular";
import { getOperationName } from "@apollo/client/utilities";
import { specGqlWaitQuery } from "./gql-respond-query.spec";

export const DEFAULT_SPEC_GRAMMAR_ID = "28066939-7d53-40de-a89b-95bf37c982be";

const DEFAULT_EMPTY_GRAMMAR = Object.freeze<FullGrammar>({
  id: "96659508-e006-4290-926e-0734e7dd061a",
  name: "Empty Spec Grammar",
  programmingLanguageId: "generic",
  root: { languageName: "spec", typeName: "root" },
  foreignTypes: {},
  foreignVisualisations: {},
  visualisations: {},
  generatedFromId: null,
  includes: null,
  slug: null,
  visualizes: null,
  blockLanguages: [],
  types: {
    spec: {
      root: {
        type: "concrete",
      },
    },
  },
});

/**
 * Generates a valid grammar description with a unique ID, that uses
 * the given data (if provided) and uses default data
 */
export const specBuildGrammarDescription = (
  override?: Partial<GrammarDescription>
): FullGrammar => {
  const id = override?.id ?? generateUUIDv4();
  const toReturn: Pick<FullGrammar, "__typename"> = {
    __typename: "Grammar",
  };
  return Object.assign(toReturn, DEFAULT_EMPTY_GRAMMAR, override || {}, { id });
};

export const specCacheGrammar = (response: FullGrammar) => {
  const apollo = TestBed.inject(Apollo);
  cacheFullGrammar(apollo, response);
  return response;
};

/**
 * Ensures that the given grammar will be available at the GrammarDataService.
 */
export const specEnsureLocalGrammarRequest = (
  response: GrammarDescription
): Promise<GrammarDescription> => {
  const resourceReferences = TestBed.inject(ResourceReferencesService);

  const toReturn = resourceReferences.getGrammarDescription(response.id, {
    fetchPolicy: "network-only",
    onMissing: "throw",
  });

  specProvideGrammarResponse(response);

  return toReturn;
};

export const specProvideGrammarResponse = async (
  response: GrammarDescription
) => {
  const op = await specGqlWaitQuery(
    (op) =>
      op.operationName === getOperationName(FullGrammarDocument) &&
      op.variables.id === response.id,
    `Grammar: ${response.id} `
  );
  op.flush({
    data: { grammar: response },
  });
};
