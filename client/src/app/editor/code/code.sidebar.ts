import { Component } from '@angular/core';
import { ComponentPortal } from '@angular/cdk/portal';

import { map, flatMap, tap } from 'rxjs/operators'

import { CodeSidebarFixedBlocksComponent } from './code-sidebar-fixed-blocks.component'
import { CurrentCodeResourceService } from '../current-coderesource.service';

import { DatabaseSchemaSidebarComponent } from './query/database-schema-sidebar.component'
import { UserFunctionsSidebarComponent } from './truck/user-functions-sidebar.component'

/**
 * Maps ids of sidebar components to their actual components.
 */
function resolvePortalComponentId(id: string): any {
  switch (id) {
    case "fixedBlocks": return (CodeSidebarFixedBlocksComponent);
    case "databaseSchema": return (DatabaseSchemaSidebarComponent);
    case "truckProgramUserFunctions": return (UserFunctionsSidebarComponent);
  }
}

/**
 * The sidebar hosts elements that can be dragged onto the currently active
 * query. Additionally it sometimes offers a "trashcan" where items can be
 * dropped if they are meant to be deleted.
 */
@Component({
  templateUrl: 'templates/sidebar.html',
  selector: "tree-sidebar"
})
export class CodeSidebarComponent {
  /**
   * This ID is used to register this sidebar with the sidebar loader
   */
  public static get SIDEBAR_IDENTIFIER() { return "tree" };

  constructor(
    private _currentCodeResource: CurrentCodeResourceService
  ) {
  }

  /**
   * The block language that is currently in use.
   */
  readonly currentBlockLanguage = this._currentCodeResource.currentResource.pipe(
    flatMap(res => res.blockLanguage)
  );

  /**
   * The actual sidebars that need to be spawned for the current language.
   */
  readonly portalInstances = this.currentBlockLanguage.pipe(
    tap(b => console.log("Code Sidebar Component: BlockLanguage", b)),
    map(blockLanguage => blockLanguage.sidebars.map(s => {
      return (new ComponentPortal(resolvePortalComponentId(s.portalComponentTypeId)));
    }))
  );
}
