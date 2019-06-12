
import { Routes, RouterModule } from '@angular/router';

import { AccountSettingsComponent } from './components/account-settings.component';
import { UserSettingsComponent } from './settings.component';

export const userSettingsRoutes: Routes = [
  {
    path: '',
    component: UserSettingsComponent,
    children: [
      {
        path: 'account',
        component: AccountSettingsComponent
      }
    ]
  }
]

export const userSettingsRouting = RouterModule.forChild(userSettingsRoutes)