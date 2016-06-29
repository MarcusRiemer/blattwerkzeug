import {Component, OnInit, OnDestroy}   from '@angular/core'
import {Router}                         from '@angular/router'

import {TableDescription}               from '../../shared/schema.description'

import {Project}                        from '../project'
import {ProjectService}                 from '../project.service'
import {SidebarService}                 from '../sidebar.service'
import {ToolbarService}                 from '../toolbar.service'
import {QueryService}                   from '../query.service'

@Component({
    templateUrl: 'app/editor/query/templates/create.html',
})
export class QueryCreateComponent implements OnInit, OnDestroy {
    private _project : Project;
    
    public queryType : string = "select";

    public queryName : string = "";

    public queryTable : string;

    /**
     * Subscriptions that need to be released
     */
    private _subscriptionRefs : any[] = [];

    constructor(
        private _projectService: ProjectService,
        private _toolbarService: ToolbarService,
        private _sidebarService: SidebarService,
        private _queryService: QueryService,
        private _router: Router
    ) {
        this._sidebarService.hideSidebar();
    }

    /**
     * Load the project to access the schema
     */
    ngOnInit() {
        this._toolbarService.resetItems();
        this._toolbarService.savingEnabled = false;
        
        let subRef = this._projectService.activeProject
            .subscribe(res => this._project = res);

        this._subscriptionRefs.push(subRef);

        // Actually allow creation
        let btnCreate = this._toolbarService.addButton("create", "Erstellen", "plus", "n");
        subRef = btnCreate.onClick.subscribe( (res) => {
            if (this.isValid) {
                const res = this._queryService.createQuery(this._project,
                                                           this.queryType,
                                                           this.queryName,
                                                           this.queryTable);

                res.subscribe( query => {
                    console.log(`New query ${query.id}`);
                    this._router.navigate(["/editor", this._project.id ,"query", query.id]);
                });
            }
        });

        this._subscriptionRefs.push(subRef);
    }

    ngOnDestroy() {
        this._subscriptionRefs.forEach( ref => ref.unsubscribe() );
        this._subscriptionRefs = [];
    }

    public get isNameValid() {
        return (this.queryName && this.queryName.length >= 1);
    }

    public get isTableValid() {
        return (!!this.queryTable);
    }

    public get isValid() {
        return (this.isNameValid && this.isTableValid);
    }

    public get availableTables() : TableDescription[] {
        if (this._project) {
            return (this._project.schema.tables);
        } else {
            return ([]);
        }
    }
}
