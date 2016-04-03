import {Component, Input}               from 'angular2/core'
import {Pipe, PipeTransform}            from 'angular2/core'

import {DragService}                    from './drag.service'

import {ProjectService}                 from '../project.service'

import {Table}                          from '../../shared/table'
import {Query, Model, SyntaxTree}       from '../../shared/query'

@Component({
    selector : 'sql-expr',
    templateUrl : 'app/editor/query/templates/query-expr.html',
    directives: [ExpressionComponent]
})
class ExpressionComponent {
    @Input() expr : SyntaxTree.Expression;
    @Input() query : Query;

    /**
     * View Variable:
     * Is this expression in editing mode?
     */
    isEditing = false;

    /**
     * Read Only View Variable:
     * Is something currently dragging above this expression?
     */
    private _currentDragOver : boolean = false;

    /**
     *
     */
    onConstantDrag(evt : DragEvent) {
        // Indicates we can drop here
        evt.preventDefault();

        this._currentDragOver = true;
    }

    /**
     *
     */
    onConstantDragLeave(evt : DragEvent) {
        this._currentDragOver = false;
    }

    onConstantDrop(evt : DragEvent) {
        // Without this prevention firefox will redirect the page to
        // the drop data.
        evt.preventDefault();

        // Remove visual dragging indicator
        this._currentDragOver = false;

        // Actually replace the current node
        this.expr.replaceSelf({
            constant : {
                type : "INTEGER",
                value : "13"
            }
        });

        // Logging the changes
        const sqlString = this.query.toSqlString();
        console.log(`onConstantDrop:\n${sqlString}`)
    }

    /**
     * Focus has been lost.
     */
    onBlur() {
        this.isEditing = false;
        // Logging the changes
        const sqlString = this.query.toSqlString();
        console.log(`onBlur:\n${sqlString}`)
    }

    /**
     * Read Only Accessor
     * @return Whether this expression is currently the relevant drop target.
     */
    get isCurrentDropTarget() : boolean {
        return (this._currentDragOver);
    }
}

@Component({
    selector : 'sql-select',
    templateUrl : 'app/editor/query/templates/query-select.html',
    directives: [ExpressionComponent]
})
class SelectComponent {
    @Input() select : SyntaxTree.Select;

    constructor(public dragService : DragService) {

    }

    onBlueprintColumnDrag(evt : DragEvent) {
        // Indicates we can drop here
        evt.preventDefault();
    }

    onBlueprintColumnDrop(evt : DragEvent) {
        // Indicates we can drop here
        evt.preventDefault();

        const table = evt.dataTransfer.getData("table");
        const column = evt.dataTransfer.getData("column");

        this.select.appendColumn(table, column);
    }

    /**
     * Read Only View Accessor
     * @return True, if a drop target for a new column should be shown.
     */
    get showBlueprintDropTarget() {
        return (this.dragService.activeColumn);
    }
}

@Component({
    selector : 'sql-from',
    templateUrl : 'app/editor/query/templates/query-from.html',
})
class FromComponent {
    @Input() from : SyntaxTree.From;
}

@Component({
    selector : 'sql-where',
    templateUrl : 'app/editor/query/templates/query-where.html',
    directives: [ExpressionComponent]
})
class WhereComponent {
    @Input() query : Query;
}


/**
 * Transforms a query into its string expression.
 */
@Pipe({name: 'sqlString'})
export class SqlStringPipe implements PipeTransform {
    public transform(value : Query, args : string[]) : any {
        try {
            return (value.toSqlString());
        } catch (e) {
            return (e);
        }
    }
}

@Component({
    selector: 'sql-query',
    templateUrl: 'app/editor/query/templates/query.html',
    directives: [ExpressionComponent, SelectComponent, FromComponent, WhereComponent]
})
export class QueryComponent {
    @Input() query : Query;

    /**
     * Used for dependency injection.
     */
    constructor(private _projectService: ProjectService)
    {}
}
