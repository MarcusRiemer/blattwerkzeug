import { Component } from "@angular/core";

import { switchMap } from "rxjs/operators";
import { CurrentCodeResourceService } from "../current-coderesource.service";
import { AiCoachService } from "./ai-coach.service";

@Component({
  templateUrl: "templates/assignment.html",
})
export class AssignmentComponent {
  constructor(
    private _currentCodeResource: CurrentCodeResourceService,
    private _aiCoachService: AiCoachService
  ) {}

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

  /**
   * Receive the assignment with accentuation from the ai coach
   */
  readonly assignmentWithAccentuation$ =
    this._aiCoachService.assignmentWithAccentuation$;

  ngOnDestroy() {
    //otherwise the assignment appears also in other tasks
    this._aiCoachService.assignmentWithAccentuation$.next(null);
  }
}
