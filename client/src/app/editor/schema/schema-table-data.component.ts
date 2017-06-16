import { Component, Input, OnInit, OnDestroy }      from '@angular/core';
import { Router, ActivatedRoute }                   from '@angular/router'

import { Table }                                    from '../../shared/schema'

import { SchemaService }                            from '../schema.service'
import { ProjectService, Project }                  from '../project.service'
import { ToolbarService }                           from '../toolbar.service'
import { SidebarService }                           from '../sidebar.service'


/**
 * Displays the schema as a list of tables.
 */
@Component({
    templateUrl: 'templates/schema-table-data.html',
    selector: "sql-table-data",
})
export class SchemaTableDataComponent implements OnInit, OnDestroy {

    constructor(
        private _schemaService: SchemaService,
        private _projectService: ProjectService,
        private _routeParams: ActivatedRoute,
        private _router: Router,
        private _route: ActivatedRoute,
        private _toolbarService: ToolbarService,
        private _sidebarService: SidebarService) {
    }

    /**
     * The currently shown table
     */
    table: Table;

    /**
    * The currently edited project
    */
    private _project: Project;

    /**
     * The entrys inside of the table
     */
    tableData: string[][];

    /**
     * The amount of Rows inside the table;
     */
    private _tableRowAmount: number;

    /**
     * The amount of rows to show
     */
    private _showRowAmount: number = 10;

    /**
     * The index from where to show the table rows
     */
    private _showRowFrom: number = 0;

    /**
     * Subscriptions that need to be released
     */
    private _subscriptionRefs: any[] = [];

    /**
     * True, if creation should be allowed from this component.
     */
    @Input() isChild: boolean = false;

    /**
     * Load the project to access the schema
     */
    ngOnInit() {
        this._sidebarService.hideSidebar();
        
        let subRef = this._routeParams.params.subscribe(params => {
            var tableName = params['tableName'];
            let projref = this._projectService.activeProject
                .subscribe(res => {
                    this._project = res;
                    if(this.isChild) {
                        this.table = this._schemaService.getCurrentlyEditedTable();
                        this.showAmount = 5;
                    } else {
                        this.table = res.schema.getTable(tableName);
                    }
                })
                this._subscriptionRefs.push(projref);
        });
        this._subscriptionRefs.push(subRef);

        //Buttons only to show if this component is not invoked as a child
        if (!this.isChild) {
            this._toolbarService.resetItems();
            this._toolbarService.savingEnabled = false;
            let btnCreate = this._toolbarService.addButton("back", "Zurück", "arrow-left", "b");
            subRef = btnCreate.onClick.subscribe((res) => {
                this.backBtn();
            })
            this._subscriptionRefs.push(subRef);

            let btnEdit = this._toolbarService.addButton("edit", "Struktur Editieren", "edit", "e");
            subRef = btnEdit.onClick.subscribe(res => {
                this._router.navigate(["../../edit", this.table.name], {
                    relativeTo: this._route
                });
            });
            this._subscriptionRefs.push(subRef);
        }

        this.refresh();
    }

    /**
     * Asks the server to refresh its data.
     */
    private refresh() {
        this.refreshData();
        this.refreshRowCount();
    }

    private refreshData() {
        this._schemaService.getTableData(this._project, this.table, this._showRowFrom, this._showRowAmount)
            .first()
            .subscribe(
                res => this.tableData = res,
                err => this.showError(err)
            );
    }

    private refreshRowCount() {
        this._schemaService.getTableRowAmount(this._project, this.table)
            .first()
            .subscribe(
                res => this._tableRowAmount = res[0],
                err => this.showError(err)
            );
    }

    /**
     * Frees now obsolete subscriptions
     */
    ngOnDestroy() {
        this._subscriptionRefs.forEach(ref => ref.unsubscribe());
        this._subscriptionRefs = [];
    }

    /**
     * Setter for showAmount to use for an ngModel
     */
    set showAmount(amount: number | string) {
        amount = +amount;
        this._showRowFrom = 0;
        this._showRowAmount = amount;
        this.refreshData();
    }

    /**
     * Getter for showAmount to use for an ngModel
     */
    get showAmount() {
        return (this._showRowAmount);
    }

    /**
     * Getter for amount of tows in Table
     */
    get rowCount() {
        return this._tableRowAmount;
    }

    /**
     * Return the Amount of Sites
     */
    get sitesOfRows() {
        let sites = Math.floor(this._tableRowAmount / this._showRowAmount);
        sites = (this._tableRowAmount % this._showRowAmount) > 0 ? sites+1 : sites;
        return sites;
    }

    /**
     * Get current shown site
     */
    get currentSite() {
        return Math.floor(this._showRowFrom / this._showRowAmount) + 1;
    }

    /**
     * Function to get the next rows of the table
     */
    nextRowSite() {
        if ((this._showRowFrom + this._showRowAmount) < this._tableRowAmount) {
            this._showRowFrom += this._showRowAmount;
            this.refreshData();
        }
    }

    /**
     * Function to get the previous rows of the table
     */
    prevRowSite() {
        if (this._showRowFrom > 0) {
            if (this._showRowFrom > this._showRowAmount) {
                this._showRowFrom -= this._showRowAmount;
            } else {
                this._showRowFrom = 0;
            }
            this.refreshData();
        }
    }

    /**
     * Function for the back button, to navigate a level up
     */
    backBtn() {
        console.log("Zurück!");
        this._router.navigate(["../../"], { relativeTo: this._route });
    }

    /**
     * Function to show an alert [TODO: Make it look good]
     */
    showError(error : any) {
        window.alert(`Ein Fehler ist aufgetretten! \n mit Nachricht: ${error.json().errorBody.toString().replace(new RegExp("\\\\", 'g'), '')}`);
    }
}
