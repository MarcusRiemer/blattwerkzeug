import { NgModule, ModuleWithProviders } from "@angular/core";

import { SharedAppModule } from "../../shared/shared.module";

import { RegistrationService } from "../registration.service";
import { EditorSharedComponentsModule } from "../shared-components/editor-shared-components.module";

import { ResourceChangedGuard } from "./resource-changed.guard";
import { CodeGeneratorComponent } from "./code-generator.component";
import { CreateCodeResourceComponent } from "./create-code-resource.component";
import { EditorComponentsService } from "./editor-components.service";
import { LanguageModelSelectorComponent } from "./language-model-selector.component";
import { LanguageEmittedSelectorComponent } from "./language-emitted-selector.component";
import { CodeSidebarComponent } from "./code.sidebar";
import { CodeSidebarFixedBlocksComponent } from "./code-sidebar-fixed-blocks.component";
import { ValidationComponent } from "./validation.component";
import { UnknownCodeResourceComponent } from "./unknown-code-resource.component";
import { DraggableBlockListComponent } from "./draggable-block-list.component";

import { BLOCK_RENDER_COMPONENTS } from "./block/index";
import { BlockRootComponent } from "./block/block-root.component";
import { BlockEditorComponent } from "./block/block-editor.component";

import { BlockHostComponent } from "./block/block-host.component";
import { BlockDebugOptionsService } from "../block-debug-options.service";

import { CodeResourceSettingsComponent } from "./block/code-resource-settings.component";
import { DropDebugComponent } from "./block/drop-debug.component";

import { DatabaseSchemaSidebarComponent } from "./query/database-schema-sidebar.component";
import { QueryPreviewComponent } from "./query/query-preview.component";
import { QueryService } from "./query/query.service";

import { WorldRenderComponent } from "./truck/world-render.component";
import { WorldSelectorComponent } from "./truck/world-selector.component";
import { TruckWorldService } from "./truck/truck-world.service";
import { WorldControllerComponent } from "./truck/world-controller.component";
import { WorldSensorsComponent } from "./truck/world-sensors.component";
import { UserFunctionsSidebarComponent } from "./truck/user-functions-sidebar.component";
import { TruckWorldMouseService } from "./truck/truck-world-mouse.service";
import { TruckWorldEditorService } from "./truck/world-editor/truck-world-editor.service";

import { DefinedTypesSidebarComponent } from "./meta/defined-types.sidebar.component";

@NgModule({
  imports: [EditorSharedComponentsModule, SharedAppModule],
  declarations: [
    ...BLOCK_RENDER_COMPONENTS,
    BlockEditorComponent,
    BlockRootComponent,
    CodeGeneratorComponent,
    CodeResourceSettingsComponent,
    CreateCodeResourceComponent,
    DropDebugComponent,
    DatabaseSchemaSidebarComponent,
    DraggableBlockListComponent,
    ValidationComponent,
    CodeSidebarComponent,
    CodeSidebarFixedBlocksComponent,
    LanguageModelSelectorComponent,
    LanguageEmittedSelectorComponent,
    QueryPreviewComponent,
    WorldRenderComponent,
    WorldControllerComponent,
    WorldSensorsComponent,
    WorldSelectorComponent,
    UserFunctionsSidebarComponent,
    UnknownCodeResourceComponent,
    DefinedTypesSidebarComponent,
  ],
  entryComponents: [
    BlockRootComponent,
    DatabaseSchemaSidebarComponent,
    CodeSidebarComponent,
    CodeSidebarFixedBlocksComponent,
    CodeResourceSettingsComponent,
    DropDebugComponent,
    QueryPreviewComponent,
    ValidationComponent,
    CodeGeneratorComponent,
    WorldRenderComponent,
    WorldControllerComponent,
    WorldSensorsComponent,
    UserFunctionsSidebarComponent,
    DefinedTypesSidebarComponent,
  ],
  providers: [ResourceChangedGuard],
  exports: [BlockHostComponent],
})
export class CodeEditorModule {
  public static forRoot(): ModuleWithProviders<CodeEditorModule> {
    return {
      ngModule: CodeEditorModule,
      providers: [
        EditorComponentsService,
        BlockDebugOptionsService,
        QueryService,
        TruckWorldService,
        TruckWorldMouseService,
        TruckWorldEditorService,
      ],
    };
  }

  constructor(reg: RegistrationService) {
    console.log("Registering CodeEditor ...");

    reg.registerSidebarType({
      componentType: CodeSidebarComponent,
      typeId: CodeSidebarComponent.SIDEBAR_IDENTIFIER,
    });

    console.log("Registered CodeEditor!");
  }
}
