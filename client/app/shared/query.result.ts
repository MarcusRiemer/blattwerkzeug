import {QuerySelect, Model}                   from './query'

/**
 * Not much ado about type safety here, in the raw
 * format every cell is a string.
 */
type RawRow = [string]

/**
 * A result is simply a list of rows.
 */
type QueryResultDescription = RawRow[]

/**
 * Parameters are simply a key-value dictionary. Whenever a query
 * makes use of user-bound parameters, these are transferred via
 * this kind of object.
 */
export type QueryParamsDescription = { [paramKey:string] : string }

/**
 * Some servers support execution of arbitrary queries. This is intended
 * to be used during development and can be done via this request-type.
 */
export type ArbitraryQueryRequestDescription = {
    params : QueryParamsDescription
    sql : string
}

/**
 * Provides some extra type information for a certain cell.
 */
class Cell {
    private _query : QuerySelect;
    private _index : number;
    private _value : string;

    constructor(query : QuerySelect, index : number, value : string) {
        this._query = query;
        this._index = index;
        this._value = value;
    }

    /**
     * Possibly formats the value based on the type.
     */
    get value() {
        return (this._value);
    }
}

/**
 * Allows to adress columns by name or index.
 */
class Row {
    private _query : QuerySelect;
    private _cells : Cell[];
    
    constructor(query : QuerySelect, raw : RawRow) {
        this._query = query;
        this._cells = raw.map( (v,k) => new Cell(query, k, v));
    }

    get cells() {
        return (this._cells);
    }
}

/**
 * Adds type information to a raw QueryResultDescription.
 */
export class QueryResult {
    private _query : QuerySelect;

    private _rows : Row[];
    
    constructor(query : QuerySelect, raw : QueryResultDescription) {
        this._query = query;
        this._rows = raw.map( v => new Row(query, v));
    }

    /**
     * @return All result rows
     */
    get rows() {
        return (this._rows);
    }

    /**
     * @return The names of the columns involved in this result.
     */
    get cols() {
        return (this._query.select.actualColums);
    }
}
