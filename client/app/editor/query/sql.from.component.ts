import {Component, Input}               from '@angular/core'

import {ExpressionComponent}            from './sql.expr.component'

import {QueryInsert}                    from '../../shared/query'

@Component({
    selector : 'sql-from',
    templateUrl : 'app/editor/query/templates/query-from.html',
})
export class FromComponent {
    @Input() query : QueryInsert;

    constructor() {

    }
}
