import { TestBed } from "@angular/core/testing";
import { ApolloTestingController } from "apollo-angular/testing";

import { MayPerformDocument } from "../../../generated/graphql";

/**
 * Mocks the result of an expected `MayPerform` request.
 */
export function specExpectMayPerform(
  variables: Record<string, unknown> | "first",
  result: boolean
) {
  const testingController = TestBed.inject(ApolloTestingController);

  testingController
    .expectOne((op) => {
      if (op.query !== MayPerformDocument) {
        return false;
      }

      if (variables === "first") {
        return true;
      } else {
        return queryParamsMatch(variables, op.variables);
      }
    })
    .flush({
      data: {
        mayPerform: {
          perform: result,
        },
      },
    });
}

function queryParamsMatch(
  givenVariables: Record<string, unknown>,
  operationVariables: Record<string, unknown>
): boolean {
  return Object.entries(givenVariables).every(([k, v]) => {
    switch (typeof v) {
      case "string":
      case "number":
      case "bigint":
      case "boolean":
        return operationVariables[k] === v;
      case "object":
        if (Array.isArray(v)) {
          throw new Error(
            "MayPerform spec utils can't check for arrays, yet ;-)"
          );
        }
        const descGiven = givenVariables[k];
        const descOperation = operationVariables[k];
        if (isRecord(descGiven) && isRecord(descOperation)) {
          return queryParamsMatch(descGiven, descOperation);
        } else {
          return false;
        }
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
