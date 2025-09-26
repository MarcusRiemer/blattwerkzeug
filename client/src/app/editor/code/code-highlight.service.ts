import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable()
export class CodeHighlightService {
  //TODO: for now not nullable because of possible null pointer exceptions in database-schema-sidebar.component.ts.
  // Maybe change this, if it makes trouble when working with the ai hint
  readonly highlightedBlock$ = new BehaviorSubject<string>("");

  constructor() {}
  /**
   * Sets the highlightedBlock to a given value.
   * Fields of a database follow the schema tableName.columnName, which is thy it is not necessary to set multiple blocks at once
   */
  setHighlightedBlock(value: string) {
    this.clearHighlight();
    this.highlightedBlock$.next(value);
  }
  /**
   * Sets the highlightedBlock to an empty string, which results in a cleared background state
   */
  //TODO: Now used before setting a new block, 10s after setting the highlight and when a drag starts. Is the usage for the drag start event ok the way I did it?
  clearHighlight(): void {
    this.highlightedBlock$.next("");
  }
}
