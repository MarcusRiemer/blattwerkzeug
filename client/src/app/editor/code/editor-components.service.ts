import { Router } from "@angular/router";
import { Injectable } from "@angular/core";
import { ComponentPortal, ComponentType } from "@angular/cdk/portal";

import { DynamicModuleLoaderService } from "../../shared/dynamic-module-loader.service";
import { EditorComponentDescription } from "../../shared/block/block-language.description";

import { ValidationComponent } from "./validation.component";
import { CodeGeneratorComponent } from "./code-generator.component";
import { JsonAstComponent } from "./json-ast.component";

import { BlockRootComponent } from "./block/block-root.component";
import { CodeResourceSettingsComponent } from "./block/code-resource-settings.component";
import { DropDebugComponent } from "./block/drop-debug.component";

import { QueryPreviewComponent } from "./query/query-preview.component";

import { WorldRenderComponent } from "./truck/world-render.component";
import { WorldControllerComponent } from "./truck/world-controller.component";
import { WorldSensorsComponent } from "./truck/world-sensors.component";
import { TruckWorldEditorComponent } from "./truck/world-editor/truck-world-editor.component";

import { RegexTestComponent } from "./regex/regex-test.component";

import { ExecuteJavaScriptComponent } from "./js/execute-java-script.component";

import { ExecuteMathComponent } from "./math/execute-math.component";

import { ExecFiniteStateMachineComponent } from "./automaton/exec-finite-state-machine.component";
import { AiCoachComponent } from "./ai-coach.component";

type ComponentTypeId = EditorComponentDescription["componentType"];

/**
 * Allows registration of available editor components and hands them
 * out on demand.
 */
@Injectable({
  providedIn: "root",
})
export class EditorComponentsService {
  private readonly _availableComponents: {
    [key in ComponentTypeId]?: ComponentType<any>;
  } = {
    "block-root": BlockRootComponent,
    "code-resource-settings": CodeResourceSettingsComponent,
    "json-ast": JsonAstComponent,
    "drop-debug": DropDebugComponent,
    "query-preview": QueryPreviewComponent,
    validator: ValidationComponent,
    "generated-code": CodeGeneratorComponent,
    "regex-test": RegexTestComponent,
    "truck-world": WorldRenderComponent,
    "truck-controller": WorldControllerComponent,
    "truck-sensors": WorldSensorsComponent,
    "truck-world-editor": TruckWorldEditorComponent,
    "execute-js": ExecuteJavaScriptComponent,
    "execute-math": ExecuteMathComponent,
    "execute-fsm": ExecFiniteStateMachineComponent,
    "ai-coach": AiCoachComponent,
  };

  constructor(
    private _moduleLoader: DynamicModuleLoaderService,
    private _router: Router
  ) {}

  /**
   * Register a new component for a certain id.
   */
  registerComponent(id: ComponentTypeId, componentType: ComponentType<any>) {
    if (this._availableComponents[id]) {
      throw new Error(
        `Attempted to register editor component "${id}" a second time`
      );
    }
    this._availableComponents[id] = componentType;

    const className = componentType.name;
    console.log(`Registered ${className} as editor component "${id}"`);
  }

  get preferBlockly() {
    return this._router.url.endsWith("blockly");
  }

  async createComponent(
    description: EditorComponentDescription
  ): Promise<ComponentPortal<{}>> {
    let typeId = description.componentType;

    // Possibly override the builtin editor for blockly
    if (typeId === "block-root" && this.preferBlockly) {
      if (!this._availableComponents["blockly"]) {
        console.log("Dynamically loading blockly editor component");

        await this._moduleLoader.loadModule(
          async () =>
            (
              await import("./blockly/blockly.module")
            ).BlocklyEditorModule
        );

        console.log("Dynamically loaded blockly editor component");
      }
      typeId = "blockly";
    }

    const toInstantiate = this._availableComponents[typeId];
    if (toInstantiate) {
      return new ComponentPortal(toInstantiate);
    } else {
      throw new Error(`No known editor component of type id "${typeId}"`);
    }
  }
}
