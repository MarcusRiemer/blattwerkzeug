import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http'

import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';

import { ServerApiService } from '../shared/serverapi.service'

import { Project, ProjectService } from './project.service'
import { Table } from '../shared/schema/'
import { RawTableDataDescription } from '../shared/schema/schema.description'
import { TableCommandHolder } from '../shared/schema/table-commands'

interface CurrentlyEdited {
  table?: Table
  stack?: TableCommandHolder
}

/**
 * Service to hold, get and send data from a schema.
 */
@Injectable()
export class SchemaService {

  /**
   * The table that is currently edited.
   */
  private _currentlyEdited: CurrentlyEdited = undefined;

  /**
   * If a HTTP request is in progress, this is it.
   */
  private _httpRequest: Observable<RawTableDataDescription>;

  /**
   * Counts the number of changes that have been made to the current
   * schema in the current session.
   */
  private _changeCount = new BehaviorSubject(0);

  /**
   * @param _http Used to do HTTP requests
   * @param _server Used to figure out paths for HTTP requests
   */
  constructor(
    private _http: Http,
    private _projectService: ProjectService,
    private _server: ServerApiService,
  ) {
  }


  /**
   * Set a new table as a currently edited table.
   */
  initCurrentlyEdit(table: Table) {
    let desc = table.toModel();
    this._currentlyEdited = {};
    this._currentlyEdited.table = new Table(desc, desc.columns, desc.foreign_keys);
    this._currentlyEdited.stack = new TableCommandHolder(this._currentlyEdited.table);
  }

  /**
   * @return The table that is currently being edited.
   */
  getCurrentlyEditedTable(): Table {
    return this._currentlyEdited.table
  }

  /**
   * @return The change stack that describes changes to the 
   *         currently edited table.
   */
  getCurrentlyEditedStack(): TableCommandHolder {
    return this._currentlyEdited.stack
  }

  /**
   * Retrieves the state of the currently edited table.
   */
  getCurrentlyEdited(): CurrentlyEdited {
    return this._currentlyEdited;
  }

  clearCurrentlyEdited() {
    this._currentlyEdited = undefined;
  }

  /**
   * The number of changes that have been made to the schema in the current
   * session.
   */
  get changeCount(): Observable<number> {
    return (this._changeCount);
  }

  /**
   * Should be called after any change to the schema. This number is used
   * as a "sort of" version to decide whether the server should be asked
   * again for a updated representation of the schema.
   */
  private incrementChangeCount() {
    this._changeCount.next(this._changeCount.value + 1);
  }

  /**
   * Function to get table entries from a table with limit and offset
   * @param project - the current project
   * @param table - the table to get the entries from
   * @param from - the index to start getting the entries from
   * @param amount - the amount of entries to get
   */
  getTableData(project: Project, table: Table, from: number, amount: number): Observable<RawTableDataDescription> {
    const url = this._server.getTableEntriesUrl(project.slug, project.currentDatabaseName, table.name, from, amount);

    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    this._httpRequest = this._http.get(url, options)
      .pipe(map((res) => res.json()))

    return (this._httpRequest);
  }

  /**
   * Function to get the amount of entries inside a table
   * @param project - the current project
   * @param table - the table to get the entries from
   */
  getTableRowAmount(project: Project, table: Table) {
    const url = this._server.getTableEntriesCountUrl(project.slug, project.currentDatabaseName, table.name);

    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    const toReturn = this._http.get(url, options)
      .pipe(
        map(res => res.json()),
        catchError(res => this.handleError(res))
      );

    return (toReturn);
  }

  /**
   * Function to save a newly created table inside the database
   * @param project - the current project
   * @param table - the table to create inside the database
   */
  saveNewTable(project: Project, table: Table): Observable<Table> {
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    const url = this._server.getCreateTableUrl(project.slug, project.currentDatabaseName);

    const body = JSON.stringify(table.toModel());

    const toReturn = this._http.post(url, body, options)
      .pipe(
        tap(_ => this.incrementChangeCount()),
        map(_ => {
          this._projectService.setActiveProject(project.slug, true);
          this.clearCurrentlyEdited();
          return table;
        }),
        catchError(this.handleError)
      );;
    return (toReturn);
  }

  /**
   * Function send table commands to alter a table
   * @param project - the current project
   * @param table - the table alter
   */
  sendAlterTableCommands(project: Project, tableName: string, commandHolder: TableCommandHolder): Observable<void> {
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    const url = this._server.getTableAlterUrl(project.slug, project.currentDatabaseName, tableName);

    const body = JSON.stringify(commandHolder.toModel());

    const toReturn = this._http.post(url, body, options)
      .pipe(
        catchError(this.handleError),
        tap(_ => this.incrementChangeCount()),
        map(_ => {
          this._projectService.setActiveProject(project.slug, true);
          this.clearCurrentlyEdited();
        })
      );
    return (toReturn);
  }

  /**
   * Function to delete a table inside the database
   * @param project - the current project
   * @param table - the table to delete
   */
  deleteTable(project: Project, table: Table): Observable<Table> {
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    const url = this._server.getDropTableUrl(project.slug, project.currentDatabaseName, table.name);

    const toReturn = this._http.delete(url, options)
      .pipe(
        tap(_ => this.incrementChangeCount()),
        map(_ => {
          this._projectService.setActiveProject(project.slug, true);
          return table;
        }),
        catchError(this.handleError)
      )
    return (toReturn);
  }


  private handleError(error: Response) {
    // in a real world app, we may send the error to some remote logging infrastructure
    // instead of just logging it to the console
    console.error(error.json());
    return Observable.throw(error);
  }

}
