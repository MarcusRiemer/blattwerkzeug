import {Schema}                          from './schema'
import {Project}                         from './project'

import * as Model                        from './query.model'
import * as SyntaxTree                   from './query.syntaxtree'
import {ValidationResult, Validateable}  from './query.validation'

import {Query, QueryFrom, QueryWhere}    from './query/base'
import {QuerySelect}                     from './query/select'
import {QueryDelete}                     from './query/delete'
import {QueryInsert}                     from './query/insert'
import {QueryUpdate}                     from './query/update'

export {
    Model, SyntaxTree, ValidationResult, Validateable,
    Query, QuerySelect, QueryDelete, QueryInsert, QueryFrom, QueryWhere, QueryUpdate
}

/**
 * Maps the given model to the correct type of query.
 *
 * @param toLoad The model to load
 *
 * @return A correct instance of a Query
 */
export function loadQuery(toLoad : Model.QueryDescription, schema : Schema, project : Project) : Query {
    // The number of distinctive top-level components that
    // are present in the model.
    let topLevelList = [toLoad.delete, toLoad.select, toLoad.insert, toLoad.update]
        .filter(v => !!v);

    // There must be a single top-level component
    if (topLevelList.length !== 1) {
        throw new Error(`There must be a single top level component, got ${topLevelList.length}`);
    }

    // From here on we are sure, that only a single to level element is set
    if (toLoad.select) {
        return (new QuerySelect(schema, toLoad));
    }
    else if (toLoad.delete) {
        return (new QueryDelete(schema, toLoad));
    }
    else if (toLoad.insert) {
        return (new QueryInsert(schema, toLoad));
    }
    else if (toLoad.update) {
        return (new QueryUpdate(schema, toLoad));
    }

    throw new Error("Unknown top-level component");
}


