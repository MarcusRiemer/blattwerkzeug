import { Injectable } from "@angular/core";
import {
  ApolloQueryResult,
  DocumentNode,
  FetchPolicy,
  WatchQueryFetchPolicy,
} from "@apollo/client/core";

import { catchError, first, map, tap } from "rxjs/operators";
import { Observable, of, concat } from "rxjs";

import {
  FullBlockLanguageDocument,
  FullBlockLanguageGQL,
  FullBlockLanguageQuery,
  FullBlockLanguageQueryVariables,
  FullGrammarDocument,
  FullGrammarGQL,
  FullGrammarQuery,
  FullGrammarQueryVariables,
} from "../../generated/graphql";

import { LanguageService } from "./language.service";
import { BlockLanguage } from "./block";
import { BlattWerkzeugError } from "./blattwerkzeug-error";
import { Validator } from "./syntaxtree/validator";
import { Language } from "./syntaxtree/language";
import { StringUnion } from "./string-union";
import { GrammarDescription } from "./syntaxtree";
import { Apollo, Query } from "apollo-angular";
import { BlockLanguageDescription } from "./block/block-language.description";

/**
 * Valid values for resources that may be required
 */
const RequiredResourceType = StringUnion(
  "blockLanguage", // A single block language
  "grammar", // A single grammar
  "blockLanguageGrammar" // A block language with its grammar
);

/**
 * Some type of resource that possibly must be available.
 */
export interface RequiredResource {
  type: typeof RequiredResourceType.type;
  id: string;
}

export function isRequiredResource(obj: any): obj is RequiredResource {
  return (
    typeof obj === "object" &&
    typeof obj["id"] === "string" &&
    RequiredResourceType.guard(obj["type"])
  );
}

export interface RetrievalOptions {
  onMissing?: "undefined" | "throw";
  fetchPolicy?: "cache-first" | "cache-only" | "network-only";
}

export type ResourceType = "BlockLanguageDescription" | "GrammarDescription";

export class ResourceRetrievalError extends BlattWerkzeugError {
  constructor(
    readonly resourceType: ResourceType,
    readonly id: string,
    readonly retrievalOptions: RetrievalOptions
  ) {
    super(`Error retrieving ${resourceType} "${id}"`);
  }
}

function fetchPolicyIncludesCache(f: RetrievalOptions["fetchPolicy"]) {
  switch (f) {
    case "cache-first":
    case "cache-only":
      return true;
    default:
      return false;
  }
}

function fetchPolicyIncludesNetwork(f: RetrievalOptions["fetchPolicy"]) {
  switch (f) {
    case "cache-first":
    case "network-only":
      return true;
    default:
      return false;
  }
}

/**
 * As resources are sometimes heavily interleaved, a generic way to access those is required.
 * In earlier iterations this was the responsibility of the `Project` class, but this horribly
 * breaks down for resources that don't belong to a project. So this interface was born :)
 */
@Injectable()
export class ResourceReferencesService {
  constructor(
    private readonly _apollo: Apollo,
    private readonly _languageService: LanguageService,
    private readonly _blockLanguage: FullBlockLanguageGQL,
    private readonly _grammar: FullGrammarGQL
  ) {}

  /**
   * @param id The ID of the requested block language
   * @param onMissing What should be done in the case of a missing resource?
   * @return The block language with the requested ID
   */
  async getBlockLanguage(
    id: string,
    { onMissing = "throw", fetchPolicy = "cache-first" }: RetrievalOptions = {}
  ): Promise<BlockLanguage> {
    const msg = [
      `Retrieving block language description "${id}"`,
      {
        onMissing,
        fetchPolicy,
      },
    ];
    //console.debug(...msg);

    const cachedResult = this.explicitApolloCache<
      FullBlockLanguageQuery,
      BlockLanguageDescription
    >(
      fetchPolicy,
      id,
      FullBlockLanguageDocument,
      (cacheResult) => cacheResult.blockLanguage
    );

    const requestResult = this.explicitApolloRequest<
      FullBlockLanguageQuery,
      FullBlockLanguageQueryVariables,
      BlockLanguageDescription
    >(
      { onMissing, fetchPolicy },
      { id },
      this._blockLanguage,
      "BlockLanguageDescription",
      (netResult) => netResult.data.blockLanguage
    );

    const combined = concat(cachedResult, requestResult);

    const result = await combined
      .pipe(
        first(),
        this.pipeEnsureOnMissing(
          { id },
          { onMissing, fetchPolicy },
          "BlockLanguageDescription"
        )
      )
      .toPromise();

    //console.debug(`DONE:`, ...msg, "=>", result);
    return result ? new BlockLanguage(result) : undefined;
  }

  /**
   * @param id The ID of the requested grammar
   * @param onMissing What should be done in the case of a missing resource?
   * @return The grammar with the requested ID
   */
  async getGrammarDescription(
    id: string,
    { onMissing = "throw", fetchPolicy = "cache-first" }: RetrievalOptions = {}
  ): Promise<GrammarDescription> {
    const msg = [
      `Retrieving grammar description "${id}"`,
      {
        onMissing,
        fetchPolicy,
      },
    ];
    //console.debug(...msg);

    const cachedResult = this.explicitApolloCache<
      FullGrammarQuery,
      GrammarDescription
    >(fetchPolicy, id, FullGrammarDocument, (res) => res.grammar);

    const requestResult = this.explicitApolloRequest<
      FullGrammarQuery,
      FullGrammarQueryVariables,
      GrammarDescription
    >(
      { onMissing, fetchPolicy },
      { id },
      this._grammar,
      "GrammarDescription",
      (res) => res.data.grammar
    );

    const combined = concat(cachedResult, requestResult);

    const result = await combined
      .pipe(
        first(),
        this.pipeEnsureOnMissing(
          { id },
          { onMissing, fetchPolicy },
          "GrammarDescription"
        )
      )
      .toPromise();

    //console.debug(`DONE:`, ...msg, "=>", result);
    return result;
  }

  /**
   * @param programmingLanguageId The core language to use, may define static code validators
   * @param grammarId The grammar to verify against
   * @return A validator that checks for both kinds of errors
   */
  async getValidator(programmingLanguageId: string, grammarId: string) {
    const programmingLanguage = this.getCoreProgrammingLanguage(
      programmingLanguageId
    );
    const specializedValidators =
      programmingLanguage.validator.specializedValidators;
    const grammarDescription = await this.getGrammarDescription(grammarId, {
      onMissing: "undefined",
    });
    if (!grammarDescription) {
      throw new Error(
        `Could not construct validator for "${programmingLanguageId}" with grammar ${grammarId} on the fly: Grammar missing`
      );
    }

    const validator = new Validator([
      grammarDescription,
      ...specializedValidators,
    ]);

    return validator;
  }

  /**
   * @param grammarId The Id of the grammar that must be available
   * @param programmingLanguageId The Id of the internal programming language
   */
  async getGrammarProgrammingLanguage(
    grammarId: string,
    programmingLanguageId: string
  ) {
    const programmingLanguage = this.getCoreProgrammingLanguage(
      programmingLanguageId
    );

    const grammarDescription = await this.getGrammarDescription(grammarId, {
      onMissing: "undefined",
    });

    if (!grammarDescription) {
      throw new Error(
        `Could not construct Language for "${programmingLanguageId}" with grammar ${grammarId} on the fly: Grammar missing`
      );
    }

    return programmingLanguage.cloneWithGrammar(grammarDescription);
  }

  /**
   * @param programmingLanguageId The id of the core language
   * @return The language as defined in the core, does not validate any grammar!
   */
  getCoreProgrammingLanguage(programmingLanguageId: string): Language {
    return this._languageService.getLanguage(programmingLanguageId);
  }

  /**
   * May be used to block until a certain set of resources is available.
   *
   * @param req All resources that must be available after the promise is fulfilled.
   */
  async ensureResources(...req: RequiredResource[]): Promise<boolean> {
    const requests: Promise<any>[] = req.map((r) => {
      switch (r.type) {
        case "blockLanguage":
          return this.getBlockLanguage(r.id, { onMissing: "undefined" });
        case "grammar":
          return this.getGrammarDescription(r.id, { onMissing: "undefined" });
        case "blockLanguageGrammar":
          return this.ensureBlockLanguageGrammar(r.id);
        default:
          throw new Error(`Unknown resource required: ${r.type}`);
      }
    });

    if (requests.some((v) => !v)) {
      console.error("Ensural promise was falsy", req, "=>", requests);
      throw new Error("Ensural promise was falsy");
    }

    const toReturn = await Promise.all(requests);
    if (toReturn.some((v) => v === undefined)) {
      console.error("Ensural result was falsy", req, "=>", toReturn);
      throw new Error("Ensural result was falsy");
    }

    return toReturn.every((v) => !!v);
  }

  /**
   * May be used to check whether a certain set of resources is available.
   *
   * @param req All resources that must be available on the spot.
   */
  async hasResources(...req: RequiredResource[]): Promise<boolean> {
    const results = await Promise.all(
      req.map(async (r): Promise<boolean> => {
        switch (r.type) {
          case "blockLanguage":
            return !!(await this.getBlockLanguage(r.id, {
              fetchPolicy: "cache-only",
              onMissing: "undefined",
            }));
          case "grammar":
            return !!(await this.getGrammarDescription(r.id, {
              fetchPolicy: "cache-only",
              onMissing: "undefined",
            }));
          case "blockLanguageGrammar":
            return this.hasBlockLanguageGrammar(r.id);
        }
      })
    );

    return results.every((v) => v);
  }

  /**
   * Helper method to check whether the block language and the referenced grammar are available
   */
  protected async hasBlockLanguageGrammar(
    blockLanguageId: string
  ): Promise<boolean> {
    const blockLang = await this.getBlockLanguage(blockLanguageId, {
      onMissing: "undefined",
    });
    if (!blockLang) {
      return false;
    }

    return this.hasResources({ type: "grammar", id: blockLang.grammarId });
  }

  /**
   * Helper method to ensures that the block language and the referenced grammar are available
   */
  protected async ensureBlockLanguageGrammar(blockLanguageId: string) {
    const hasBlockLang = await this.ensureResources({
      type: "blockLanguage",
      id: blockLanguageId,
    });
    if (!hasBlockLang) {
      return false;
    }
    // We know that the block language must exist, so we may as well throw
    const blockLang = await this.getBlockLanguage(blockLanguageId, {
      onMissing: "throw",
    });

    return this.ensureResources({ type: "grammar", id: blockLang.grammarId });
  }

  private explicitApolloCache<TResponse, TResult>(
    fetchPolicy: RetrievalOptions["fetchPolicy"],
    id: String,
    document: DocumentNode,
    mapFunc: (res: TResponse) => TResult
  ): Observable<TResult> {
    if (fetchPolicyIncludesCache(fetchPolicy)) {
      const cached = this._apollo.client.cache.readQuery<TResponse>({
        query: document,
        variables: {
          id,
        },
      });

      // Everything is fine if we have found a value: The
      // mapper must then extract it.
      if (cached) {
        //console.debug("Cache hit: ", cached);
        return of(mapFunc(cached));
      } else {
        // If we don't have a value and are the only stop:
        // Indicate that there is no value
        if (fetchPolicy === "cache-only") {
          //console.debug("Cache miss, but only stop for", id);
          return of(undefined);
        }
        // If we don't have a value but there is a chance for
        // a hit: Don't produce any value.
        else {
          //console.debug("Cache miss, but network available for", id);
          return of();
        }
      }
    } else {
      // Empty observable sequence which does not contain any value
      return of();
    }
  }

  private explicitApolloRequest<TResponse, TVars, TResult>(
    retrieval: RetrievalOptions,
    vars: TVars,
    query: Query<TResponse, TVars>,
    resourceType: ResourceType,
    mapFunc: (res: ApolloQueryResult<TResponse>) => TResult
  ): Observable<TResult> {
    if (fetchPolicyIncludesNetwork(retrieval.fetchPolicy)) {
      return (
        query
          // This method explicitly wants to make a request, caching is taken care of
          // elsewhere
          .fetch(vars, { fetchPolicy: "network-only" })
          .pipe(
            tap((res) => {
              console.log(
                `PROGRESS ${resourceType} "${JSON.stringify(vars)}" =>`,
                res
              );
            }),
            // Swallow errors
            catchError((err) => {
              console.error(
                `ERROR ${resourceType} "${JSON.stringify(vars)}" =>`,
                err
              );
              return of(undefined);
            }),
            // Only use the mapFunc if there is a result
            map((res) => (res ? mapFunc(res) : undefined))
          )
      );
    } else {
      return of();
    }
  }

  private pipeEnsureOnMissing<T>(
    id: Object,
    options: RetrievalOptions,
    resourceType: ResourceType
  ) {
    return map<T, T>((desc) => {
      if (desc) {
        return desc;
      } else {
        switch (options.onMissing) {
          case "throw":
            // The internet says its okay to throw here:
            // https://stackoverflow.com/questions/43199642/how-to-throw-error-from-rxjs-map-operator-angular
            throw new ResourceRetrievalError(
              resourceType,
              JSON.stringify(id),
              options
            );
          case "undefined":
            return undefined;
        }
      }
    });
  }
}
