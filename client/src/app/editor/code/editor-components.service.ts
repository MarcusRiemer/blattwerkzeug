import { ComponentPortal } from '@angular/cdk/portal';

import { EditorComponentDescription } from '../../shared/block/block-language.description';

import { QueryPreviewComponent } from './query/query-preview.component';
import { WorldRenderComponent } from './truck/world-render.component';
import { ValidationComponent } from './validation.component';
import { CodeGeneratorComponent } from './code-generator.component';
import { WorldControllerComponent } from './truck/world-controller.component';
import { WorldSensorsComponent } from './truck/world-sensors.component';

/**
 * Allows registration of available editor components and hands them
 * out on demand.
 */
export class EditorComponentsService {
  createComponent(description: EditorComponentDescription): ComponentPortal<{}> {
    switch (description.componentType) {
      case "query-preview": return (new ComponentPortal(QueryPreviewComponent));
      case "validator": return (new ComponentPortal(ValidationComponent));
      case "generated-code": return (new ComponentPortal(CodeGeneratorComponent));
      case "truck-world": return (new ComponentPortal(WorldRenderComponent));
      case "truck-controller": return (new ComponentPortal(WorldControllerComponent));
      case "truck-sensors": return (new ComponentPortal(WorldSensorsComponent));
    }
  }
}
