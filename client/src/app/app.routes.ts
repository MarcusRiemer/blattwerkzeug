import { Routes, RouterModule } from '@angular/router'

import { editorRoutes } from './editor/editor.routes'
import { frontRoutes } from './front/front.routes'
import { AuthGuard } from './shared/guards/auth.guard';

const AppRoutes: Routes = [
  {
    path: 'editor/:projectId',
    children: editorRoutes
  },
  {
    path: 'about',
    children: frontRoutes
  },
  {
    path: 'user',
    loadChildren : () => import('./user/user.module').then(m => m.UserModule), // new dynamic import method
  },
  {
    // The admin module has a few heavyweight dependencies and is
    // therefore not bundled with the main application.
    path: 'admin',
    // loadChildren: './admin/admin.module#AdminModule',
    loadChildren : () => import('./admin/admin.module').then(m => m.AdminModule), // new dynamic import method
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: '/about',
    pathMatch: 'full',
  },
]

// Ensure that "global" parameters (especially the projectId)
// is passed down to the editor modules.
export const routing = RouterModule.forRoot(AppRoutes, {
  paramsInheritanceStrategy: "always",
});
