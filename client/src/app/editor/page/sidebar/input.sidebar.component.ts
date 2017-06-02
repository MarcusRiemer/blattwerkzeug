import {Component, Inject, Optional}   from '@angular/core'

import {Input}                         from '../../../shared/page/widgets/index'

import {SIDEBAR_MODEL_TOKEN}           from '../../editor.token'

import {WidgetComponent}               from '../widget.component'

/**
 * Displays the sidebar editing component for a heading.
 */
@Component({
    templateUrl: 'templates/input-sidebar.html',
})
export class InputSidebarComponent {

    private _component : WidgetComponent<Input>;

    constructor(@Inject(SIDEBAR_MODEL_TOKEN) com : WidgetComponent<Input>) {
        this._component = com;
    }
    
    /**
     * The model that is worked on.
     */
    get model() {
        return (this._component.model);
    }
}

export const INPUT_SIDEBAR_IDENTIFIER = "page-input";

export const INPUT_REGISTRATION = {
    typeId : INPUT_SIDEBAR_IDENTIFIER,
    componentType : InputSidebarComponent
}
