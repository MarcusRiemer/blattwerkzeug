import { Component, Inject } from "@angular/core";

import { CodeResource, QualifiedTypeName } from "../../../shared/syntaxtree";
import { Table, Column } from "../../../shared/schema";

import { SIDEBAR_MODEL_TOKEN } from "../../editor.token";

import { DragService } from "../../drag.service";
import { EditDatabaseSchemaService } from "../../edit-database-schema.service";
import { Observable } from "rxjs";
import { CodeHighlightService } from "../code-highlight.service";
import { map, shareReplay } from "rxjs/operators";
import { state, style, trigger } from "@angular/animations";

@Component({
  templateUrl: "templates/database-schema-sidebar.html",
  animations: [
    trigger("background", [
      state("neutral", style({ background: "white" })),
      state("highlighted", style({ background: "#d63384" })),
    ]),
  ],
})
export class DatabaseSchemaSidebarComponent {
  readonly highlights: Record<string, Observable<string>> = {};

  constructor(
    @Inject(SIDEBAR_MODEL_TOKEN)
    private _codeResource: CodeResource,
    private _dragService: DragService,
    private _schemaService: EditDatabaseSchemaService,
    private codeHighlightService: CodeHighlightService
  ) {
    this.possibleTables.forEach((table) => {
      this.highlights[table.name] = codeHighlightService.highlightedBlock$.pipe(
        map(
          (highlighted) =>
            highlighted === table.name ||
            highlighted.startsWith(`${table.name}.`)
        ),
        map((isHighlighted) => (isHighlighted ? "highlighted" : "neutral")),
        shareReplay(1)
      );

      table.columns.forEach((column) => {
        this.highlights[`${table.name}.${column.name}`] =
          codeHighlightService.highlightedBlock$.pipe(
            map(
              (highlighted) => highlighted === `${table.name}.${column.name}`
            ),
            map((isHighlighted) => (isHighlighted ? "highlighted" : "neutral")),
            shareReplay(1)
          );
      });
    });
  }

  /**
   * @return The tables that should be shown.
   */
  get possibleTables(): Table[] {
    return this._schemaService.currentSchema.tables;
  }

  /**
   * @return The name of the current database
   */
  get databaseName() {
    return this._schemaService.currentDatabaseName;
  }

  /**
   * The user has decided to start dragging something from the sidebar.
   */
  startTableDrag(evt: DragEvent, table: Table) {
    this.codeHighlightService.clearHighlight();

    try {
      this._dragService.dragStart(evt, [
        {
          language: "sql",
          name: "tableIntroduction",
          properties: {
            name: table.name,
          },
        },
      ]);
    } catch (e) {
      alert(e);
    }
  }

  /**
   * The user has decided to start dragging something from the sidebar.
   */
  startColumnDrag(evt: DragEvent, table: Table, column: Column) {
    this.codeHighlightService.clearHighlight();

    try {
      this._dragService.dragStart(evt, [
        {
          language: "sql",
          name: "columnName",
          properties: {
            columnName: column.name,
            refTableName: table.name,
          },
        },
      ]);
    } catch (e) {
      alert(e);
    }
  }

  /**
   * @param table The table that may have its columns filtered
   * @return A list of columns that may be rendered
   */
  columnsOfTable(table: Table): Column[] {
    const searchType: QualifiedTypeName = {
      languageName: "sql",
      typeName: "tableIntroduction",
    };
    const knownTables = new Set(
      this._codeResource.syntaxTreePeek
        .getNodesOfType(searchType)
        .map((node) => node.properties["name"])
    );

    if (knownTables.has(table.name)) {
      return table.columns;
    } else {
      return [];
    }
  }
}
