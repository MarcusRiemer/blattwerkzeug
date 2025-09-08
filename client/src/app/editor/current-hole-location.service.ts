import { Injectable } from "@angular/core";
import { BehaviorSubject, combineLatest } from "rxjs";
import { _exactMatches, NodeLocation } from "../shared";
import { CurrentCodeResourceService } from "./current-coderesource.service";
import { map } from "rxjs/operators";

@Injectable()
export class CurrentHoleLocationService {
  private _currentHoleLocation = new BehaviorSubject<NodeLocation | null>(null);
  readonly currentHoleLocation$ = this._currentHoleLocation.asObservable();
  //   readonly currentDropNode$ = combineLatest([
  //     this.currentDropLocation$,
  //     this._currentCodeResourceService.currentTree,
  //   ]).pipe(map(([drop, tree]) => tree.locate(drop.slice(0, -1))));
  constructor() {} // private _currentCodeResourceService: CurrentCodeResourceService

  setCurrentHoleLocation(location: NodeLocation) {
    this._currentHoleLocation.next(location);
    console.log("Block Location", this._currentHoleLocation);
  }

  clearCurrentHoleLocation() {
    this._currentHoleLocation.next(null);
  }
}
