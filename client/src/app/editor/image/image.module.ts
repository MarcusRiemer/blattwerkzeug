import { NgModule, ModuleWithProviders } from '@angular/core'

import { SharedEditorModule } from '../shared/shared.module'
import { RegistrationService } from '../registration.service'

import { ImageListComponent } from './image-list.component'
import { ImageUploadComponent } from './image-upload.component'
import { ImageEditComponent } from './image-edit.component'
import { ImageSelectorComponent } from './image-selector.component'
import { ImageService } from './image.service'

@NgModule({
  imports: [
    SharedEditorModule,
  ],
  declarations: [
    ImageListComponent,
    ImageUploadComponent,
    ImageEditComponent,
    ImageSelectorComponent,
  ],
  entryComponents: [
  ],
  exports: [
    ImageSelectorComponent
  ]
})
export class ImageEditorModule {
  static forRoot(): ModuleWithProviders {
    return ({
      ngModule: ImageEditorModule,
      providers: [ImageService]
    });
  }

  constructor(reg: RegistrationService) {
    console.log("Registering ImageEditor ...");

    console.log("Registered ImageEditor!");
  }
}
