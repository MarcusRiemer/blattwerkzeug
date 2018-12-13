import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router'
import { HttpClient } from '@angular/common/http'

import { map, flatMap, first, tap, share } from 'rxjs/operators'

import { ProjectService, Project } from '../project.service'
import { SchemaService } from '../schema.service'
import { SidebarService } from '../sidebar.service'
import { ToolbarService } from '../toolbar.service'

/**
 * A class as entry-point for the representation of a schema
 */
@Component({
  templateUrl: 'templates/schema.html'
})
export class SchemaComponent implements OnInit {
  /**
   * The currently edited project
   */
  public project: Project;

  /**
   * Subscriptions that need to be released
   */
  private _subscriptionRefs: any[] = [];

  /**
   * Used for dependency injection.
   */
  constructor(
    private _sanitizer: DomSanitizer,
    private _http: HttpClient,
    private _projectService: ProjectService,
    private _toolbarService: ToolbarService,
    private _router: Router,
    private _route: ActivatedRoute,
    private _sidebarService: SidebarService,
    private _schemaService: SchemaService,
  ) {
  }

  /**
   * @return True, if this is an empty schema
   */
  get isEmpty() {
    return (this.project && this.project.schema.isEmpty);
  }

  /**
   * @return A timestamp to ensure the schema-image is reloaded
   */
  get schemaRevision() {
    return (this._schemaService.changeCount);
  }

  /**
   * The URL that may be used to request a schema
   */
  readonly visualSchemaUrl =
    this.schemaRevision.pipe(
      map(rev => `/api/project/${this.project.slug}/db/default/visual_schema?format=svg&revision=${rev}`),
    );

  readonly visualSchemaDom =
    this.visualSchemaUrl.pipe(
      flatMap(url => this._http.get(url, { responseType: 'text' })),
      first(),
      share(),
      map(svg => svg.replace(/<svg width="(\d+pt)" height="\d+pt"/, '<svg width="$1"')),
      map(svg => this._sanitizer.bypassSecurityTrustHtml(svg)),
    );

  /**
   * Load the project to access the schema
   */
  ngOnInit() {
    this._sidebarService.hideSidebar();

    this._toolbarService.resetItems();
    this._toolbarService.savingEnabled = false;

    // Button to show the preview of the currently editing table
    let btnCreate = this._toolbarService.addButton("createTable", "Neue Tabelle", "table", "n");
    let subRef = btnCreate.onClick.subscribe(_ => {
      this._router.navigate(["./create"], { relativeTo: this._route });
    })
    this._subscriptionRefs.push(subRef);

    // Button to switch to data import, only shown if there is
    // a table the data could be imported to
    if (!this.isEmpty) {
      let btnImport = this._toolbarService.addButton("importTable", "Daten Importieren", "file-text", "i");
      subRef = btnImport.onClick.subscribe((res) => {
        this._router.navigate(["./import"], { relativeTo: this._route });
      })
      this._subscriptionRefs.push(subRef);
    }

    // Butto to switch to database import
    let btnUpload = this._toolbarService.addButton("uploadDatabase", "Datenbank hochladen", "upload", "d");
    subRef = btnUpload.onClick.subscribe((res) => {
      this._router.navigate(["./upload"], { relativeTo: this._route });
    })
    this._subscriptionRefs.push(subRef);


    // Ensure that the active project is always available
    subRef = this._projectService.activeProject
      .subscribe(res => {
        this.project = res
      });
    this._subscriptionRefs.push(subRef);
  }

  ngOnDestroy() {
    this._subscriptionRefs.forEach(ref => ref.unsubscribe());
    this._subscriptionRefs = [];
  }

}
