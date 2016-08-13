import {Routes, RouterModule}      from '@angular/router'

import {FrontComponent}            from './front.component'
import {ImprintComponent}          from './imprint.component'
import {ProjectListComponent}      from './project-list.component'
import {AboutComponent}            from './about.component'

const frontRoutes : Routes = [
    {
        path: '',
        redirectTo: '/about',
        terminal: true
    },
    {
        path : 'about',
        component: FrontComponent,
        children : [
            { path: 'projects', component: ProjectListComponent},
            { path: 'imprint',  component: ImprintComponent},
            { path: '',         component: AboutComponent},
        ]
    }
]

export const frontRouting = RouterModule.forChild(frontRoutes);
