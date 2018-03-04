import { Routes, RouterModule } from '@angular/router'

import { EditorComponent } from './editor.component'

import { SettingsComponent } from './project-settings/settings.component'

import { ProjectExistsGuard } from './project-exists.guard'

import { schemaEditorRoutes } from './schema/schema.routes'
import { imageEditorRoutes } from './image/image.routes'
import { codeEditorRoutes } from './code/code.routes'

export const editorRoutes: Routes = [
  {
    path: "",
    component: EditorComponent,
    canActivate: [ProjectExistsGuard],
    children: [
      {
        path: '',
        redirectTo: 'settings',
        pathMatch: 'full'
      },
      {
        path: 'settings',
        component: SettingsComponent
      },
      {
        path: 'schema',
        children: [...schemaEditorRoutes]
      },
      {
        path: 'ast',
        children: [...codeEditorRoutes]
      },
      {
        path: 'image',
        children: [...imageEditorRoutes]
      }
    ]
  }
]

export const editorRouting = RouterModule.forChild(editorRoutes);
