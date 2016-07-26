/**
 * Inputs and outputs *may* use identical names but are not required
 * to do so.
 */
export interface ParameterMappingDescription {
    inputName : string

    outputName : string
}

/**
 * This action kicks of some mutation query
 */
export interface QueryActionDescription {
    queryName : string

    mapping : ParameterMappingDescription[]
}

/**
 * Describes a input widget. These are usually text-orientated.
 */
export interface InputDescription extends WidgetDescription {
    type : "input"
    inputType : string
    caption : string
    description : string
    outParamName : string
}

/**
 * Describes a button the user can press to execute some query or
 * plugin action.
 */
export interface ButtonDescription extends WidgetDescription {
    type : "button"

    // The text on the button
    text : string

    // What happens if the user presses the button?
    action : QueryActionDescription
}

/**
 * Describes a table that shows the results of a query.
 */
export interface QueryTableDescription {
    type: "query-table"
    queryRefName? : string
    columns : string[]
}

/**
 * Describes a heading widget.
 */
export interface HeadingDescription extends WidgetDescription {
    type : "heading"
    text : string
    level : number
}

/**
 * Describes a paragraph widget.
 */
export interface ParagraphDescription extends WidgetDescription {
    type : "paragraph"
    text : string
}

/**
 * A widget **requires** at least a type, all other fields are
 * mandated by deriving descriptions. As we don't necesarily
 * know all deriving classes at compile time (they could be
 * provided by a plugin) we poke a hole in the type system
 * here.
 *
 * The following annotion is required to allow additional
 * properties in the automatically generated JSON schema, see
 * https://github.com/YousefED/typescript-json-schema/issues/44
 *
 * @TJS-additionalProperties true
 */
export interface WidgetDescription {
    // Discriminator value
    type : string
    [additional: string]: any
}

/**
 * Describes a column that can host certain widgets
 */
export interface ColumnDescription {
    width : number
    widgets : WidgetDescription[]
}

/**
 * Describes a row that can host certain cells.
 */
export interface RowDescription {
    columns : ColumnDescription[]
}

/**
 * A single or repeating value of any origin, as long as it's
 * referenceable by a variable name.
 *
 * @TJS-additionalProperties true
 */
export interface ValueReferenceDescription {
    // Discriminator value
    type : "column" | "query"
}

/**
 * Can be used to denote a column of a row. This description is completly
 * agnostic of the query it references.
 */
export interface ColumnReferenceDescription extends ValueReferenceDescription {
    type : "column"

    // The query variable this column references
    variableName : string

    // The name of the column
    columnName : string
}

/**
 * Referenced queries are always accompanied by a human-readable
 * name. This is required if the same query is going to be used
 * multiple times on a single page.
 */
export interface QueryReferenceDescription extends ValueReferenceDescription {
    type : "query" 

    // The id of the query this reference points to
    queryId : string

    // The user-defined name of the reference
    name : string
}

/**
 * Describes a page as a whole
 */
export interface PageDescription {
    /**
     * The (at least) project-wide unique ID of this page.
     */
    id : string

    /**
     * A user-defined name of this page.
     */
    name : string

    /**
     * Rows are the top-level element for the whole layout,
     * for the moment no other type of widget is expected.
     */
    rows : RowDescription[]

    /**
     * IDs of queries that are referenced in this page. Only
     * these queries provide additional DB information that can
     * be used on this page.
     */
    referencedQueries : QueryReferenceDescription[]
}
