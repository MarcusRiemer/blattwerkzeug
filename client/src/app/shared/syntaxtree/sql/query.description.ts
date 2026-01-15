import { NodeDescription } from "../syntaxtree.description";

/**
 * Parameters for queries (for the moment) may be primitive values.
 */
export type QueryParamsDescription = { [key: string]: string | number };

/**
 * The server response with the names of all columns and then the
 * rows that are simply arrays of string.
 */
export interface QueryResponseDescription {
  columns: string[];
  rows: string[][];
  totalCount: number;
  unknownTotal: boolean;
}

/**
 * Allows running more or less arbitrary queries on the server.
 */
export interface ArbitraryQueryRequestDescription {
  ast: NodeDescription;
  params: QueryParamsDescription;
  grammarId: string | null;
}
