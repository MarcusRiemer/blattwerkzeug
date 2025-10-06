import { Component, Inject } from "@angular/core";

import { CodeResource, QualifiedTypeName } from "../../../shared/syntaxtree";
import { Table, Column } from "../../../shared/schema";

import { SIDEBAR_MODEL_TOKEN } from "../../editor.token";

import { DragService } from "../../drag.service";
import { EditDatabaseSchemaService } from "../../edit-database-schema.service";
import { combineLatest, Observable, of } from "rxjs";
import { CodeHighlightService } from "../code-highlight.service";
import { map, shareReplay } from "rxjs/operators";
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from "@angular/animations";
import { CurrentCodeResourceService } from "../../current-coderesource.service";
import { CurrentHoleLocationService } from "../../current-hole-location.service";
import { BlockState, isLegalChild } from "../block-state";

@Component({
  templateUrl: "templates/database-schema-sidebar.html",
  animations: [
    trigger("background", [
      state("neutral", style({ background: "white" })),
      state("highlighted", style({ background: "#d63384" })),
      transition("neutral => highlighted", animate("500ms ease-out")),
      transition("highlighted => neutral", animate("500ms ease-out")),
    ]),
    trigger("visibility", [
      state("visible", style({ opacity: 1.0, transform: "scale(1.0)" })),
      state(
        "invisible",
        style({ opacity: 0, transform: "scale(0)", display: "none" })
      ),
      transition("visible => invisible", animate("500ms ease-out")),
      transition("invisible => visible", animate("500ms ease-out")),
    ]),
  ],
})
export class DatabaseSchemaSidebarComponent {
  readonly highlights: Record<string, Observable<string>> = {};
  readonly visbilities: Record<string, Observable<BlockState>> = {};
  readonly isTableColumnHighlighted: Record<string, Observable<boolean>> = {};

  constructor(
    @Inject(SIDEBAR_MODEL_TOKEN)
    private _codeResource: CodeResource,
    private _dragService: DragService,
    private _schemaService: EditDatabaseSchemaService,
    private codeHighlightService: CodeHighlightService,
    private currentHoleLocationService: CurrentHoleLocationService,
    private currentCodeResourceService: CurrentCodeResourceService
  ) {
    this.possibleTables.forEach((table) => {
      this.possibleTables.forEach((table) => {
        const isColumnHighlighted$ =
          codeHighlightService.highlightedBlock$.pipe(
            map((highlighted) => highlighted.startsWith(`${table.name}.`)),
            shareReplay(1)
          );

        this.isTableColumnHighlighted[table.name] = isColumnHighlighted$;

        this.highlights[table.name] = combineLatest([
          codeHighlightService.highlightedBlock$.pipe(
            map((highlighted) => highlighted === table.name)
          ),
          isColumnHighlighted$,
        ]).pipe(
          map(
            ([isTableHighlighted, isColumnHighlighted]) =>
              isTableHighlighted || isColumnHighlighted
          ), //tables are also highlighted, if their columns are highlighted
          map((isHighlighted) => (isHighlighted ? "highlighted" : "neutral")),
          shareReplay(1)
        );
      });

      this.visbilities[table.name] = combineLatest(
        of([
          {
            language: "sql",
            name: "tableIntroduction",
          },
        ]),
        this.currentCodeResourceService.validator$,
        this.currentCodeResourceService.currentTree,
        this.currentHoleLocationService.currentHoleLocation$,
        of([
          {
            language: "sql",
            name: "columnName",
          },
        ])
      ).pipe(
        map(([table, val, tree, holeLocation, tableFakeColumn]): BlockState => {
          const toReturn =
            isLegalChild(table, val, tree, holeLocation) ||
            isLegalChild(tableFakeColumn, val, tree, holeLocation); // table should also be visible, if a column is allowed in the holeLocation
          return toReturn ? "visible" : "invisible";
        }),
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

        this.visbilities[`${table.name}.${column.name}`] = combineLatest(
          of([
            {
              language: "sql",
              name: "columnName",
            },
          ]),
          this.currentCodeResourceService.validator$,
          this.currentCodeResourceService.currentTree,
          this.currentHoleLocationService.currentHoleLocation$
        ).pipe(
          map(([tableColumn, val, tree, holeLocation]): BlockState => {
            const toReturn = isLegalChild(tableColumn, val, tree, holeLocation);
            return toReturn ? "visible" : "invisible";
          }),
          shareReplay(1)
        );
      });
    });
  }

  /**
   * Receives the currentHoleLocation, if this is null, no hole is selected
   */
  readonly currentHoleLocation$ =
    this.currentHoleLocationService.currentHoleLocation$;

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

    this.currentHoleLocationService.clearCurrentHoleLocation();

    console.log("Table", table);

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

    this.currentHoleLocationService.clearCurrentHoleLocation();

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
