import {
    Page, RowDescription, ColumnDescription
} from '../page'

import {Column}                    from './column'
import {
    HostingWidget, WidgetHost, WidgetBase,
} from './widget-base'

export {RowDescription}

/**
 * Rows are the top-level element of most pages.
 */
export class Row extends HostingWidget {
    private _columns : Column[];

    constructor(desc : RowDescription, parent? : WidgetHost) {
        super("row", parent);
        
        // Create all referenced columns
        this._columns = desc.columns.map(columnDesc => new Column(columnDesc, parent));
    }

    /**
     * A description for a row that is empty. This currently defaults to a row
     * with a column that spans the whole row.
     */
    static get emptyDescription() : RowDescription {
        return ({
            type : "row",
            columns : [{
                type : "column",
                widgets : [],
                width : 12
            }]
        });
    }

    /**
     * @return All columns that are part of this row
     */
    get children() {
        return (this._columns);
    }

    protected toModelImpl() : RowDescription {
        return ({
            type : "row",
            columns : this._columns.map(c => c.toModel()) as ColumnDescription[]
        });
    }
}
