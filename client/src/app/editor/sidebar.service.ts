import { Injectable, Type } from "@angular/core";

import { BehaviorSubject, Observable } from "rxjs";
import { map } from "rxjs/operators";

import { RegistrationService } from "./registration.service";

/**
 * Manages the global state of the sidebar. Components should *never*
 * interact with the sidebar directly but always use this service
 * instead.
 */
@Injectable()
export class SidebarService {
  /**
   * Used to hand out IDs that are guaranteed to be unique.
   * These IDs are then later used to distinguish created
   * sidebar components.
   */
  private static _idCounter: number = 0;

  /**
   * The model that is currently displayed (or at least will
   * be displayed the next tick).
   */
  private _model = new BehaviorSubject<InternalSidebarModel[]>([]);

  private _visibilityObs = this._model.pipe(map((s) => s.length > 0));

  /**
   * Valid types for sidebars.
   */
  private _knownTypes: { [typeName: string]: Type<any> } = {};

  constructor(registrationService: RegistrationService) {
    registrationService.sidebarTypes.subscribe((reg) => {
      this.registerType(reg.typeId, reg.componentType);
    });
  }

  /**
   * Hides the currently shown sidebar.
   */
  hideSidebar() {
    console.log("SidebarService: Hidden!");
    this._model.next([]);
  }

  /**
   * Registers a new type of sidebar that is ready for use. Never do this
   * on an instance of the service directly, instead use the RegistrationService.
   *
   * @see RegistrationService
   *
   * @param newType The string ID that is used to request this type.
   * @param component The component constructr that should be used.
   */
  private registerType(newType: string, componentType: Type<any>) {
    if (this.isKnownType(newType)) {
      console.log(`Overwriting sidebar type "${newType}"`);
    }

    this._knownTypes[newType] = componentType;
  }

  /**
   * @return True, if the given type could be shown by the sidebar.
   */
  isKnownType(newType: string): boolean {
    return !!this._knownTypes[newType];
  }

  /**
   * @return The component type for the given identifier.
   */
  getComponentType(newType: string): any {
    return this._knownTypes[newType];
  }

  /**
   * Triggers showing a different sidebar.
   *
   * @param newType The new type of sidebar to show. This is a
   *    string, but the identifier should be retrieved using the
   *    SIDEBAR_IDENTIFIER property of the Sidebar Component you
   *    are using.
   * @param param The parameter to pass to the sidebar, this depends
   *    on the sidebar that is going to be displayed.
   */
  showSingleSidebar(newType: string, param?: any) {
    this.showMultiple([{ type: newType, param: param }], true);
  }

  showAdditionalSidebar(newType: string, param?: any) {
    this.showMultiple([{ type: newType, param: param }], false);
  }

  /**
   * Triggers showing multiple different sidebars.
   *
   * @return The IDs of these sidebars.
   */
  showMultiple(mult: SidebarModel[], replace = true): number[] {
    console.log(`Requested new Sidebars:`, mult);

    // Ensure every type is known. This does not use `every`
    // but `forEach` with a side-effect because we wan't to
    // know the offending type.
    mult.forEach((e) => {
      if (!this.isKnownType(e.type)) {
        throw new Error(`Unknown sidebar type: ${e.type}`);
      }
    });

    // Assign the Id to each model
    let internal: InternalSidebarModel[] = mult.map((m) => {
      return {
        id: ++SidebarService._idCounter,
        type: m.type,
        param: m.param,
        sticky: !!m.sticky,
      };
    });

    // If the existing model shouldn't be replaced, it needs to
    // be appended to the new model.
    if (!replace) {
      internal = internal.concat(this._model.getValue());
    }

    // Kick off the rendering by placing a new value in the observable
    this._model.next(internal);

    return internal.map((m) => m.id);
  }

  /**
   * @return An observable that raises events when
   *         the visibility of the sidebar changes.
   */
  get isSidebarVisible() {
    return this._visibilityObs;
  }

  /**
   * @return An observable for the current type of the sidebar
   */
  get sidebarModel(): Observable<InternalSidebarModel[]> {
    return this._model;
  }

  /**
   * Filter the Sidebar for Blocks with a specific Keyword
   */
  readonly _filter$ = new BehaviorSubject<InternalSidebarModel[]>([]);
}

/**
 * Denotes a sidebar component that should be rendered.
 */
export interface SidebarModel {
  // The sidebar-type-id to show
  type: string;
  // The parameter to pass to the sidebar
  param?: any;
  // True, if the sidebar should usually be displayed.
  sticky?: boolean;
}

/**
 * The internally stored representation is extended with
 * an id.
 */
export interface InternalSidebarModel extends SidebarModel {
  id: number;
}
