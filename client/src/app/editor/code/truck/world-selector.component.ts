import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CurrentCodeResourceService } from '../../current-coderesource.service';

/**
 * Provides a convenient way to select a world to run a truck
 * program in.
 */
@Component({
  templateUrl: 'templates/world-selector.html',
  selector: 'truck-world-selector'
})
export class WorldSelectorComponent {

  // Fired when the world changes
  @Output() selectedWorldIdIdChange = new EventEmitter<string>();

  // Backing field for the world that is selected
  private _selectedWorldId: string = undefined;

  constructor(
    private _currentCodeResource: CurrentCodeResourceService,
  ) {
  }

  /**
   * @return All worlds that are applicable to the current program.
   */
  get availableWorlds() {
    const codeResources = this._currentCodeResource.peekResource.project.codeResources;
    return (codeResources.filter(res => res.emittedLanguageIdPeek == "truck-world"));
  }

  /**
   * @return The id of the currently selected world.
   */
  @Input()
  get selectedWorldId() {
    return (this._selectedWorldId);
  }

  /**
   * Assigns a different world.
   */
  set selectedWorldId(id: string) {
    this._selectedWorldId = id;
    this.selectedWorldIdIdChange.emit(id);
  }
}