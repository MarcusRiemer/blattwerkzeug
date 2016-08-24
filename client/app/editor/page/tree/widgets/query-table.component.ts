import {Component, Inject, OnInit} from '@angular/core'

import {QueryTable}               from '../../../../shared/page/widgets/index'

import {WIDGET_MODEL_TOKEN}       from '../../../editor.token'

/**
 * Allows to edit a QueryTable
 */
@Component({
    templateUrl: 'app/editor/page/tree/widgets/templates/query-table.html',
})
export class QueryTableComponent {    
    constructor(@Inject(WIDGET_MODEL_TOKEN) public model : QueryTable) {

    }

    get columnNames() : string[] {
        return (this.model.columnNames);
    }
}
