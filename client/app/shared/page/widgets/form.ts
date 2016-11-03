import {WidgetDescription, FormDescription}        from '../page.description'

import {loadWidget}                                from './widget-loader'
import {
    Widget, HostingWidget, WidgetHost, WidgetBase, UserInputWidget
} from './widget-base'

export {FormDescription}

/**
 * Describes a HTML form.
 */
export class Form extends HostingWidget {
    private _action : string;

    private _method : string;

    private _widgets : WidgetBase[];

    constructor(desc : FormDescription, parent? : WidgetHost) {
        super("form", "structural", false, parent);

        this._widgets = desc.children.map( (wiDesc) => loadWidget(wiDesc, this) );
    }

    /**
     * This describes a "minimal" form
     */
    static get emptyDescription() : FormDescription {
        return ({
            type : "form",
            children : []
        })
    }

    /**
     * @return The widgets for this form.
     */
    get children() {
        return (this._widgets);
    }

    get providedNames() : string[] {
        return (this.children.filter(c => c instanceof UserInputWidget)
                .map((ui : UserInputWidget) => ui.outParamName));
    }

    /**
     * Accepts anything that isn't a form itself.
     */
    acceptsWidget(desc : WidgetDescription) : boolean {
        return (desc.type != this.type);
    }

    protected toModelImpl() : WidgetDescription {
        const toReturn : FormDescription = {
            type : "form",
            children : this._widgets.map(w => w.toModel())
        }

        return (toReturn);
    }

}
