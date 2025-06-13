import { NgModule, ModuleWithProviders } from "@angular/core";

import { SharedAppModule } from "../../shared/shared.module";

import { RegistrationService } from "../registration.service";
import { EditorSharedComponentsModule } from "../shared-components/editor-shared-components.module";

import { ResourceChangedGuard } from "./resource-changed.guard";
import { CodeGeneratorComponent } from "./code-generator.component";
import { CreateCodeResourceComponent } from "./create-code-resource.component";
import { CreateLanguageComponent } from "./create-language.component";
import { LanguageModelSelectorComponent } from "./language-model-selector.component";
import { LanguageEmittedSelectorComponent } from "./language-emitted-selector.component";
import { CodeSidebarComponent } from "./code-sidebar.component";
import { CodeSidebarFixedBlocksComponent } from "./code-sidebar-fixed-blocks.component";
import { ValidationComponent } from "./validation.component";
import { AiCoachComponent } from "./ai-coach.component";
import { UnknownCodeResourceComponent } from "./unknown-code-resource.component";
import { DraggableBlockListComponent } from "./draggable-block-list.component";
import { JsonAstComponent } from "./json-ast.component";
import { CreateOverviewComponent } from "./create-overview.component";

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
import { QueryStepwiseComponent } from "./query/query-stepwise.component";
import { QueryStepwiseResultComponent } from "./query/query-stepwise-result.component";
import { QueryStepwiseDescriptionComponent } from "./query/query-stepwise-description.component";

import { WorldRenderComponent } from "./truck/world-render.component";
import { WorldSelectorComponent } from "./truck/world-selector.component";
import { TruckWorldService } from "./truck/truck-world.service";
import { WorldControllerComponent } from "./truck/world-controller.component";
import { WorldSensorsComponent } from "./truck/world-sensors.component";
import { UserFunctionsSidebarComponent } from "./truck/user-functions-sidebar.component";
import { TruckWorldMouseService } from "./truck/truck-world-mouse.service";
import { TruckWorldEditorService } from "./truck/world-editor/truck-world-editor.service";
import { TruckWorldEditorComponent } from "./truck/world-editor/truck-world-editor.component";
import { TruckWorldTilesSidebarComponent } from "./truck/world-editor/truck-world-tiles-sidebar.component";
import { TrafficLightVisualisator } from "./truck/world-editor/traffic-light-visualisator.component";

import { DefinedTypesSidebarComponent } from "./meta/defined-types.sidebar.component";

import { RegexTestComponent } from "./regex/regex-test.component";

import { ExecuteJavaScriptComponent } from "./js/execute-java-script.component";
import { ExecuteMathComponent } from "./math/execute-math.component";
import { NerdamerPipe } from "./math/nerdamer.pipe";

@NgModule({
  imports: [EditorSharedComponentsModule, SharedAppModule],
  declarations: [
    ...BLOCK_RENDER_COMPONENTS,
    BlockEditorComponent,
    BlockRootComponent,
    CodeGeneratorComponent,
    CodeResourceSettingsComponent,
    CreateCodeResourceComponent,
    CreateLanguageComponent,
    DropDebugComponent,
    DatabaseSchemaSidebarComponent,
    DraggableBlockListComponent,
    ValidationComponent,
    AiCoachComponent,
    CodeSidebarComponent,
    CodeSidebarFixedBlocksComponent,
    LanguageModelSelectorComponent,
    LanguageEmittedSelectorComponent,
    QueryPreviewComponent,
    WorldRenderComponent,
    WorldControllerComponent,
    WorldSensorsComponent,
    WorldSelectorComponent,
    TruckWorldEditorComponent,
    TrafficLightVisualisator,
    TruckWorldTilesSidebarComponent,
    UserFunctionsSidebarComponent,
    UnknownCodeResourceComponent,
    DefinedTypesSidebarComponent,
    JsonAstComponent,
    RegexTestComponent,
    QueryStepwiseComponent,
    QueryStepwiseResultComponent,
    QueryStepwiseDescriptionComponent,
    CreateOverviewComponent,
    ExecuteJavaScriptComponent,
    ExecuteMathComponent,
    NerdamerPipe,
  ],
  providers: [ResourceChangedGuard],
  exports: [BlockHostComponent],
})
export class CodeEditorModule {
  public static forRoot(): ModuleWithProviders<CodeEditorModule> {
    return {
      ngModule: CodeEditorModule,
      providers: [
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
