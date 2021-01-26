import { Injectable } from "@angular/core";

import {
  SidebarDescription,
  Sidebar,
  FixedBlocksSidebar,
  DatabaseSchemaSidebar,
  ProgramUserFunctionsSidebar,
  MetaDefinedTypesSidebar,
  TruckWorldTilesSidebar,
} from "../shared/block";
import { DatabaseSchemaService } from "./database-schema.service";

@Injectable({
  providedIn: "root",
})
export class SidebarDataService {
  constructor(private _databaseSchema: DatabaseSchemaService) {}

  /**
   * Creates proper Sidebar instances from various descriptions.
   *
   * This method is defined on this service, as the actual sidebars might need
   * all sorts of runtime data that is provided by other services.
   */
  instantiateSidebars(desc: readonly SidebarDescription[]): Sidebar[] {
    return desc.map((sidebarDesc) => {
      switch (sidebarDesc.type) {
        case "fixedBlocks":
          return new FixedBlocksSidebar(sidebarDesc);
        case "databaseSchema":
          return new DatabaseSchemaSidebar(this._databaseSchema.currentSchema);
        case "truckProgramUserFunctions":
          return new ProgramUserFunctionsSidebar();
        case "metaDefinedTypes":
          return new MetaDefinedTypesSidebar();
        case "truckWorldTiles":
          return new TruckWorldTilesSidebar();
        default:
          throw new Error(`Unknown sidebar type: ${(sidebarDesc as any).type}`);
      }
    });
  }
}
