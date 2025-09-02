import { Injectable } from "@angular/core";
import { BehaviorSubject, Subscription, timer } from "rxjs";
import { take } from "rxjs/operators";

//TODO: Im Verzeichnis richtig eingeordnet?
@Injectable()
export class CodeHighlightService {
  //TODO: for now not nullable because of possible null pointer exceptions in database-schema-sidebar.component.ts.
  // Maybe change this, if it makes trouble when working with the ai hint
  readonly highlightedBlock$ = new BehaviorSubject<string>("");

  private highlightTimerSub?: Subscription;

  constructor() {}
  /**
   * Sets the highlightedBlock to a given value.
   * Fields of a database follow the schema tableName.columnName, which is thy it is not necessary to set multiple blocks at once
   */
  setHighlightedBlock(value: string) {
    this.highlightedBlock$.next(value);

    this.highlightTimerSub?.unsubscribe();

    this.highlightTimerSub = timer(10000)
      .pipe(take(1))
      .subscribe(() => {
        this.clearHighlight();
      });
  }
  /**
   * Sets the highlightedBlock to an empty string, which results in a cleared background state
   */
  //TODO: Now used before setting a new block, 10s after setting the highlight and when a drag starts. Is the usage for the drag start event ok the way I did it?
  clearHighlight(): void {
    this.highlightedBlock$.next("");
  }
}
