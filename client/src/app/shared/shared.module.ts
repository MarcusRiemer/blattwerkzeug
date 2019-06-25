import { ProviderShowComponent } from './provider-show.component';
import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PortalModule } from '@angular/cdk/portal';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material';
import { MatTooltipModule } from '@angular/material/tooltip';

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
import { RequestResetPasswordComponent } from './auth/request-reset-password.component';
import { ProviderButtonComponent } from './auth/provider-button.component';
import { SignInComponent } from './auth/sign-in.component';
import { SignUpComponent } from './auth/sign-up.component';
import { LinkIdentityComponent } from './auth/link-identity.component';
import { ValidateInputComponent } from './auth/validate-input.component';
import { ChangePasswordComponent } from './auth/change-password.component';
import { SideNavService } from './side-nav.service';
import { RequestVerifyEmailComponent } from './auth/request-verify-email.component';
import { ProvidersAllButtonsComponent } from './auth/providers-all-buttons.component';



const dataServices = [GrammarDataService, BlockLanguageDataService];

const materialModules = [
  MatToolbarModule, MatButtonModule, MatMenuModule,
  MatTooltipModule, MatSnackBarModule, MatTabsModule,
  MatSidenavModule, MatListModule, MatCardModule, MatDatepickerModule,
  MatNativeDateModule, MatInputModule, MatFormFieldModule, MatIconModule
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
    ProviderButtonComponent,
    SignInComponent,
    SignUpComponent,
    ValidateInputComponent,
    FocusDirective,
    RequestResetPasswordComponent,
    RequestVerifyEmailComponent,
    ChangePasswordComponent,
    ValidateInputComponent,
    LinkIdentityComponent,
    ProviderShowComponent,
    ProvidersAllButtonsComponent
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
    ProviderButtonComponent,
    SignInComponent,
    SignUpComponent,
    ValidateInputComponent,
    FocusDirective,
    RequestResetPasswordComponent,
    RequestVerifyEmailComponent,
    ChangePasswordComponent,
    ProviderShowComponent,
    LinkIdentityComponent,
    ProvidersAllButtonsComponent
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
        SideNavService,
        ...dataServices
      ]
    });
  }

}
