import 'rxjs/Rx';

import {Model}                  from '../../shared/query'
import {Removable, Expression}  from '../../shared/syntaxtree/common'

import {Subject}                from 'rxjs/Subject'
import {Injectable}             from 'angular2/core';

/**
 * The scopes a drag event could affect
 */
export type ScopeFlag = "expr" | "column" | "constant" | "parameter" | "compound" | "table" | "star";
export type OriginFlag = "query" | "sidebar";

/**
 * Abstract information about the drag event.
 */
export interface SqlDragEvent {
    scope : ScopeFlag[]
    origin : OriginFlag
    expr? : Model.Expression
    join? : Model.Join
}

/**
 * Coordinates dragging events among all components that make use of
 * drag & drop to construct queries.
 */
@Injectable()
export class DragService {
    private _eventSource : Subject<SqlDragEvent>;

    private _currentDrag : SqlDragEvent;

    // This seems like an awful hack, but here we go:
    // Because it isn't possible to put references to actual Javascript
    // Objects into the Drag & Drop events, the source reference needs
    // to be stored elsewhere. This property comes into play, when any
    // kind of operation needs to occur at the "origin" end in reaction
    // to a drag & drop operation.
    private _currentSource : Removable;

    constructor() {
        this._eventSource = new Subject();
    }

    /**
     * Starts a drag operation for the given scope.
     *
     * @param scope The scope that the dragged item matches.
     */
    private dragStart(evt : DragEvent, sqlEvt : SqlDragEvent, source? : Removable) {
        // There can only be a single drag event at once
        if (this._currentDrag || this._currentSource) {
            throw { "err" : "Attempted to start a second drag" }
        }
        
        this._currentDrag = sqlEvt;
        this._currentSource = source;

        // Serialize the dragged "thing"
        const dragData = JSON.stringify(this._currentDrag);
        evt.dataTransfer.setData('text/plain', dragData);
        
        // We are only interested in the top level drag element, if
        // we wouldn't stop the propagation, the parent of the current
        // drag element would fire another dragstart.
        evt.stopPropagation();

        // Controls how the mouse cursor looks when hovering over
        // allowed targets.
        if (sqlEvt.origin == "sidebar") {
            evt.dataTransfer.effectAllowed = 'copy';
        } else {
            evt.dataTransfer.effectAllowed = 'move';
        }

        // Reset everything once the operation has ended
        evt.target.addEventListener("dragend", () => {
            this._currentDrag = null;
            this._currentSource = null;
            console.log(`Drag ended: ${dragData}`);
        });

        console.log(`Drag started: ${dragData}`);
    }

    /**
     * Calculates the scope flags for an expression model.
     *
     * @param model The expression model we want to scope.
     *
     * @return A list of scopes matching the model.
     */
    private calculateScopeFlags(model : Model.Expression) {
        let scope : ScopeFlag[] = ["expr"];
        if (model.binary) {
            scope.push("compound");
        } else if (model.constant) {
            scope.push("constant");
        } else if (model.parameter) {
            scope.push("parameter");
        } else if (model.singleColumn) {
            scope.push("column");
        } else if (model.star) {
            scope.push("column");
            scope.push("star");
        }

        return (scope);
    }

    /**
     * Start dragging an arbitrary expression, which may or may not have
     * some kind of source attached.

     * @param model The model to insert at the drop location
     * @param origin The logical source of this operation
     * @param evt The DOM drag event to enrich
     * @param source A node that is associated as a logical source.
     */
    startExpressionModelDrag(model : Model.Expression,
                             origin : OriginFlag, evt : DragEvent, source? : Removable) {
        this.dragStart(evt, {
            scope : this.calculateScopeFlags(model),
            origin : origin,
            expr : model
        }, source);
    }

    /**
     * Start to drag an existing expression.
     *
     * @param origin The logical source of this operation
     * @param evt The DOM drag event to enrich
     */
    startExistingExpressionDrag(origin : OriginFlag, evt : DragEvent, expr : Expression) {
        this.startExpressionModelDrag(expr.toModel(), origin, evt, expr);
    }

    /**
     * Starts a drag event involving a constant
     *
     * @param origin The logical source of this operation
     * @param evt The DOM drag event to enrich
     */
    startConstantDrag(origin : OriginFlag, evt : DragEvent, source? : Removable) {        
        this.startExpressionModelDrag({
            constant : {
                type : "INTEGER",
                value : "1"
            }
        }, origin, evt, source);
    }

    /**
     * Starts a drag event involving a column
     *
     * @param origin The logical source of this operation
     * @param evt The DOM drag event to enrich
     */
    startColumnDrag(table : string, column : string,
                    origin : OriginFlag, evt : DragEvent, source? : Removable) {
        this.startExpressionModelDrag({
            singleColumn : {
                column : column,
                table : table
            }
        }, origin, evt, source);
    }

    /**
     * Starts a drag event involving a compound expression
     *
     * @param evt The DOM drag event to enrich
     */
    startCompoundDrag(operator : string, origin : OriginFlag, evt : DragEvent, source? : Removable) {
        this.startExpressionModelDrag({
            binary : {
                lhs : { missing : { } },
                rhs : { missing : { } },
                operator : operator,
                simple : true
            }
        }, origin, evt, source);
    }

    /**
     * Starts a drag event involving a parameter expression
     *
     * @param evt The DOM drag event to enrich
     */
    startParameterDrag(origin : OriginFlag, evt : DragEvent, source? : Removable) {
        this.startExpressionModelDrag({
            parameter : {
                key : "key"
            }
        }, origin, evt, source);
       
    }

    /**
     * Starts a drag event involving a table.
     *
     * @param evt The DOM drag event to enrich
     */
    startTableDrag(join : Model.Join,
                   origin : OriginFlag, evt : DragEvent, source? : Removable) {
        this.dragStart(evt, {
            scope : ["table"],
            origin : origin,
            join : join
        }, source);
    }

    /**
     * @return True, if the current drag operation originated in the query
     */
    get activeFromQuery() {
        return (this._currentDrag && this._currentDrag.origin == "query");
    }

    /**
     * @return True, if the current drag operation originated in the sidebar
     */
    get activeFromSidebar() {
        return (this._currentDrag && this._currentDrag.origin == "sidebar");
    }

    /**
     * @return True, if a constant is involved in the current drag operation
     */
    get activeExpression() {
        return (this._currentDrag && this._currentDrag.scope.indexOf("expr") >= 0);
    }

    /**
     * @return True, if a constant is involved in the current drag operation
     */
    get activeConstant() {
        return (this._currentDrag && this._currentDrag.scope.indexOf("constant") >= 0);
    }

    /**
     * @return True, if a column is involved in the current drag operation
     */
    get activeColumn() {
        return (this._currentDrag && this._currentDrag.scope.indexOf("column") >= 0);
    }

    /**
     * @return True, if a column is involved in the current drag operation
     */
    get activeCompound() {
        return (this._currentDrag && this._currentDrag.scope.indexOf("compound") >= 0);
    }

    /**
     * @return True, if a table is involved in the current drag operation
     */
    get activeTable() {
        return (this._currentDrag && this._currentDrag.scope.indexOf("table") >= 0);
    }


    /**
     * @return The source of the drag operation.
     */
    get activeSource() : Removable {
        return (this._currentSource);
    }
}
