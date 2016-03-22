import {Component, Input}            from 'angular2/core'

import {Query}                       from '../../shared/query'

@Component({
    templateUrl: 'app/editor/query/templates/sidebar.html',
    selector : 'sql-sidebar'
})
export class SidebarComponent {
    @Input() query : Query;

    onDragStart(evt : DragEvent) {
        console.log(evt);
    }
}
