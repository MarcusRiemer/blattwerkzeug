import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { SharedAppModule } from "../shared/shared.module";

import { ImageEditorModule } from "./image/image.module";
import { CodeEditorModule } from "./code/code.module";

import { EditorComponent } from "./editor.component";

import { DraggedBlockComponent } from "./dragged-block.component";
import { EditorToolbarComponent } from "./editor-toolbar.component";
import { NavbarComponent } from "./navbar.component";
import { SidebarLoaderComponent } from "./sidebar-loader.component";
import { SettingsComponent } from "./project-settings/settings.component";
import { QueryIconComponent } from "./query-icon.component";
import { TrashComponent } from "./trash.component";
import { TrashService } from "./trash.service";
import { ContenteditableModel } from "./contenteditable-model.directive";
import { SourceIconComponent } from "./source-icon.component";
import { EditDatabaseSchemaService } from "./edit-database-schema.service";
import { CurrentCodeResourceService } from "./current-coderesource.service";
import { EditorToolbarService } from "./toolbar.service";
import { SidebarService } from "./sidebar.service";
import { DatabaseSchemaService } from "./database-schema.service";
import { SidebarDataService } from "./sidebar-data.service";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,

    SharedAppModule,

    ImageEditorModule.forRoot(),
    CodeEditorModule.forRoot(),
  ],
  declarations: [
    DraggedBlockComponent,
    EditorComponent,
    EditorToolbarComponent,
    NavbarComponent,
    SidebarLoaderComponent,
    SettingsComponent,
    QueryIconComponent,
    ContenteditableModel,
    TrashComponent,
    SourceIconComponent,
  ],
  providers: [
    TrashService,
    EditDatabaseSchemaService,
    DatabaseSchemaService,
    CurrentCodeResourceService,
    EditorToolbarService,
    SidebarService,
    SidebarDataService,
  ],
  exports: [
    EditorComponent,
    SettingsComponent,

    QueryIconComponent,
    TrashComponent,
    ContenteditableModel,
    SourceIconComponent,
  ],
})
export class EditorModule {}
