import { Component } from "@angular/core";

import { switchMap } from "rxjs/operators";
import { CurrentCodeResourceService } from "../current-coderesource.service";

@Component({
  templateUrl: "templates/assignment.html",
})
export class AssignmentComponent {
  constructor(private _currentCodeResource: CurrentCodeResourceService) {}

  /**
   * To get the current code resource that is being edited.
   * This is the resource that is currently displayed in the editor.
   */
  readonly codeResource$ = this._currentCodeResource.currentResource;

  /**
   * Receive the current assignment from the code resource.
   */
  readonly assignment$ = this.codeResource$.pipe(
    switchMap((resource) => resource.assignment$)
  );
}
