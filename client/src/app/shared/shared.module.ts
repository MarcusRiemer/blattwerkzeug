import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PortalModule } from '@angular/cdk/portal';
import {
  MatToolbarModule, MatButtonModule, MatMenuModule,
  MatTooltipModule, MatSnackBarModule, MatTabsModule,
  MatSidenavModule, MatListModule, MatCardModule, MatDatepickerModule, MatNativeDateModule, MatInputModule, MatFormFieldModule, MatError
} from '@angular/material'

import { AnalyticsService } from './analytics.service';
import { BrowserService } from './browser.service'
import { DefaultValuePipe } from './default-value.pipe'
import { FlashMessageListComponent } from './flash.component';
import { FlashService } from './flash.service';
import { ProjectDescriptionService } from './project.description.service';
import { LanguageService } from './language.service';
import { ServerApiService } from './serverdata/serverapi.service';
import { ServerDataService } from './serverdata/server-data.service'
import { VideoService } from './video.service';
import { ToolbarComponent } from './toolbar.component'
import { ToolbarService } from './toolbar.service'
import { ChangeLanguageComponent } from './change-language.component';
import { JavascriptRequiredComponent } from './javascript-required.component';
import { SideNavComponent } from './side-nav.component';
import { NavSiteComponent } from './nav-page.component';
import { NewsComponent } from './news.component';
import { NewsDetailsComponent } from './news-details.component';
import { MultiLingualInputComponent } from './multilingual-input.component';
import { MultiLingualEditorComponent } from './multilingual-editor.component';
import { FocusDirective } from './focus-element.directive';
import { UserButtonComponent } from './auth/user-button.component';
import { AuthDialogComponent } from './auth/auth-dialog.component';
import { LoginWrapperComponent } from './auth/login-wrapper.component';


import { GrammarDataService, BlockLanguageDataService } from './serverdata'
import { ResetPasswordRequestComponent } from './auth/reset-password-request.component';
import { ProviderAuthComponent } from './auth/provider-auth.component';
import { SignInComponent } from './auth/sign-in.component';
import { SignUpComponent } from './auth/sign-up.component';
import { LinkIdentityComponent } from './auth/link-identity.component';
import { ValidateInputComponent } from './auth/validate-input.component';
import { ChangePasswordComponent } from './auth/change-password.component';


const dataServices = [GrammarDataService, BlockLanguageDataService];

const materialModules = [
  MatToolbarModule, MatButtonModule, MatMenuModule,
  MatTooltipModule, MatSnackBarModule, MatTabsModule,
  MatSidenavModule, MatListModule, MatCardModule, MatDatepickerModule,
  MatNativeDateModule, MatInputModule, MatFormFieldModule
]

/**
 * Bundles facilities that are used all over the app, no matter
 * what the exact domain is. This basically boils down to:
 *
 * - User specific data and authentication
 * - Logging and error handling
 * - Helper utilities
 * - General Components (own and third party)
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule,
    PortalModule,
    ReactiveFormsModule,
    ...materialModules
  ],
  declarations: [
    DefaultValuePipe,
    FlashMessageListComponent,
    ToolbarComponent,
    ChangeLanguageComponent,
    JavascriptRequiredComponent,
    SideNavComponent,
    NavSiteComponent,
    NewsComponent,
    NewsDetailsComponent,
    MultiLingualInputComponent,
    MultiLingualEditorComponent,
    AuthDialogComponent,
    UserButtonComponent,
    LoginWrapperComponent,
    ProviderAuthComponent,
    SignInComponent,
    SignUpComponent,
    ValidateInputComponent,
    FocusDirective,
    ResetPasswordRequestComponent,
    ChangePasswordComponent,
    ValidateInputComponent,
    LinkIdentityComponent
  ],
  exports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PortalModule,
    HttpClientModule,
    ...materialModules,
    ToolbarComponent,
    FlashMessageListComponent,
    DefaultValuePipe,
    ChangeLanguageComponent,
    JavascriptRequiredComponent,
    SideNavComponent,
    NavSiteComponent,
    NewsComponent,
    NewsDetailsComponent,
    MultiLingualInputComponent,
    MultiLingualEditorComponent,
    AuthDialogComponent,
    UserButtonComponent,
    LoginWrapperComponent,
    ProviderAuthComponent,
    SignInComponent,
    SignUpComponent,
    ValidateInputComponent,
    FocusDirective,
    ResetPasswordRequestComponent,
    ChangePasswordComponent,
    LinkIdentityComponent
  ],
  entryComponents: [AuthDialogComponent, LinkIdentityComponent, ChangePasswordComponent]
})
export class SharedAppModule {
  static forRoot(): ModuleWithProviders {
    return ({
      ngModule: SharedAppModule,
      providers: [
        AnalyticsService,
        BrowserService,
        FlashService,
        ServerApiService,
        ServerDataService,
        ProjectDescriptionService,
        VideoService,
        LanguageService,
        ToolbarService,
        ...dataServices
      ]
    });
  }

}
