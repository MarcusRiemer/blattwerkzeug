import {Component, Input}  from '@angular/core'

import {
    Query, QuerySelect, QueryDelete, QueryInsert, QueryUpdate
} from '../shared/query'

/**
 * Renders a matching icon for a query.
 */
@Component({
    template: '<span class="fa {{ iconForQuery(query) }} fa-fw"></span><template [ngIf]="showName">{{ query?.name }}</template>',
    selector: 'query-icon'
})
export class QueryIconComponent {

    @Input() query : Query;

    @Input() showName = true;
    
    /**
     * @param query The query that needs an icon.
     *
     * @return A Font Awesome CSS icon class
     */
    iconForQuery(query : Query) {
        if (query instanceof QueryDelete) {
            return ("fa-ban");
        } else if (query instanceof QueryInsert) {
            return ("fa-plus-circle");
        } else if (query instanceof QueryUpdate) {
            return ("fa-pencil");
        } else if (query instanceof QuerySelect) {
            return ("fa-search");
        } else {
            return ("fa-bug");
        }
    }
}
