import {
    Component, Inject, OnInit, ChangeDetectorRef
} from '@angular/core'

import {Button, QueryAction}          from '../../../shared/page/widgets/index'

import {QueryIconComponent}           from '../../query-icon.component'
import {SidebarService}               from '../../sidebar.service'
import {WIDGET_MODEL_TOKEN}           from '../../editor.token'

import {DragService, PageDragEvent}   from '../drag.service'

import {WidgetComponent}              from './widget.component'
import {
    BUTTON_SIDEBAR_IDENTIFIER, ButtonSidebarComponent
} from './button.sidebar.component'

export {Button, QueryAction}

@Component({
    templateUrl: 'app/editor/page/widgets/templates/button.html',
    selector: "esqulino-paragraph",
    directives: [QueryIconComponent]
})
export class ButtonComponent extends WidgetComponent<Button> implements OnInit {
    
    constructor(@Inject(WIDGET_MODEL_TOKEN) model : Button,
                sidebarService : SidebarService,
                private _cdRef : ChangeDetectorRef) {
        super(sidebarService, model, {
            id: BUTTON_SIDEBAR_IDENTIFIER,
            type : ButtonSidebarComponent
        });
    }

    ngOnInit() {
        if (this.model.action) {
            this.model.action.ensureDefaultMappings();
        }
    }

    get parameters() {
        if (this.model.hasAction) {
            return (this.model.action.mappings);
        } else {
            return ([]);
        }
    }

    /**
     * Something has been dragged over the button action
     */
    onActionDragOver(evt : DragEvent) {
        // Is the thing that could be possibly dropped a QueryReference?
        const pageEvt = <PageDragEvent> JSON.parse(evt.dataTransfer.getData('text/plain'));
        if (pageEvt.queryRef) {
            // Indicates we can drop here
            evt.preventDefault();
            evt.stopPropagation();
        }
    }

    /**
     * Something has been dropped on the query name
     */
    onActionDrop(evt : DragEvent) {
        // Is the thing that could be possibly dropped a QueryReference?
        const pageEvt = <PageDragEvent> JSON.parse(evt.dataTransfer.getData('text/plain'));
        if (pageEvt.queryRef) {
            // Indicates we can drop here
            evt.preventDefault();
            evt.stopPropagation();

            this.model.action = new QueryAction(this.model, {
                type : "query",
                mapping : [],
                queryName : pageEvt.queryRef.name
            });
        }
    }

}

