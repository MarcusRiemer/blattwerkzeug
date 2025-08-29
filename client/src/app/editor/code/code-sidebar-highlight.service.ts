import { Injectable } from "@angular/core";
import { CurrentCodeResourceService } from "../current-coderesource.service";
import { first, map, switchMap } from "rxjs/operators";
import { FixedBlocksSidebarDescription } from "src/app/shared/block";
import { BehaviorSubject, Observable } from "rxjs";

//TODO: Im Verzeichnis richtig eingeordnet?
@Injectable()
export class CodeSidebarHighlightService {
  highlightedBlock$ = new BehaviorSubject<string | null>(null);

  constructor() {}
  /**
   * Sets the highlightedBlock to a given value
   */
  setHighlightedBlock(value: string) {
    //TODO: multiple blocks possible, especially if a databse field should be highlighted (idea: highlight table and field bc of dropdown functionality)
    this.highlightedBlock$.next(value);
  }
  /**
   * Sets the highlightedBlock to null, which results in a cleared background state
   */
  //TODO: This isn't used yet, which results in a nonstop highlight => Find a way to use this (maybe a timer? Or when the drag starts?)
  clearHighlight(): void {
    this.highlightedBlock$.next(null);
  }
  /**
   * Compares the value from the highlightedBlock to the given displayName
   *
   * @param displayName name of the block that has to be checked
   * @returns true, if the block should be highlighted
   */
  isHighlighted(displayName: string): Observable<boolean> {
    return this.highlightedBlock$.pipe(
      map((highlighted) => highlighted === displayName)
    );
  }
}
