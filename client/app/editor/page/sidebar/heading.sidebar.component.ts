import {Component, Inject, Optional}   from '@angular/core'

import {Heading}                       from '../../../shared/page/widgets/index'

import {SIDEBAR_MODEL_TOKEN}           from '../../editor.token'

import {WidgetComponent}               from '../widget.component'

type EditedComponent = WidgetComponent<Heading>

/**
 * Displays the sidebar editing component for a heading.
 */
@Component({
    templateUrl: 'app/editor/page/sidebar/templates/heading-sidebar.html',
})
export class HeadingSidebarComponent {

    private _model : Heading;

    constructor(@Inject(SIDEBAR_MODEL_TOKEN) com : EditedComponent) {
        this._model = com.model;
    }

    /**
     * The model that is worked on.
     */
    get model() {
        return (this._model);
    }
}

export const HEADING_SIDEBAR_IDENTIFIER = "page-heading";

export const HEADING_REGISTRATION = {
    typeId : HEADING_SIDEBAR_IDENTIFIER,
    componentType : HeadingSidebarComponent
}
