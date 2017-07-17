import { Component } from '@angular/core'

import { SchemaService } from '../schema.service'

/**
 * Shows the stack of operations in the sidebar.
 */
@Component({
  templateUrl: 'templates/sidebar-stack.html',
  selector: "schema-editor-table-sidebar-stack"
})
export class TableEditorSidebarStackComponent {
  public static get SIDEBAR_IDENTIFIER() { return "schema-table-editor" };

  public constructor(private _schemaService: SchemaService) {

  }

  public get commandsHolder() {
    return (this._schemaService.getCurrentlyEditedStack());
  }

  /**
   * Function to click on the stack list to go to a position
   * @param index - Index of stack to jump to
   */
  loadStackPosition(index: number) {
    if (index > this.commandsHolder.activeIndex) {
      while (index != this.commandsHolder.activeIndex) {
        this.commandsHolder.redo();
      }
    } else {
      while (index != this.commandsHolder.activeIndex) {
        this.commandsHolder.undo();
      }
    }
  }
}
