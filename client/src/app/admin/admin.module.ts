import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';

import { ReactiveFormsModule } from '@angular/forms';

import { AceEditorModule } from 'ng2-ace-editor';

import { SharedAppModule } from '../shared/shared.module'

import { adminRouting } from './admin.routes'

import { AdminComponent } from './admin.component'
import { AdminOverviewComponent } from './admin-overview.component'
import { EditGrammarComponent } from './edit-grammar.component'
import { LinkGrammarComponent } from './link-grammar.component'
import { JsonEditor } from './json-editor.component'
import { JsonSchemaValidationService } from './json-schema-validation.service'

import { CreateBlockLanguageComponent } from './block-language/create-block-language.component'
import { EditBlockLanguageComponent } from './block-language/edit-block-language.component'
import { EditActualParametersComponent } from './block-language/edit-actual-parameters.component'
import { EditInputParameterValueComponent } from './block-language/edit-input-parameter-value.component'
import { EditTraitScopesComponent } from './block-language/edit-trait-scopes.component'
import { EditSingleTraitScopeComponent } from './block-language/edit-single-trait-scope.component'
import { ErrorListComponent } from './block-language/error-list.component'

import { CreateGrammarComponent } from './grammar/create-grammar.component'
import { OverviewGrammarComponent } from './grammar/overview-grammar.component';
import { OverviewBlockLanguageComponent } from './block-language/overview-block-language.component';

import { AdminNewsListComponent } from './news.component';
import { AdminNewsEditComponent } from './edit-news.component';

const materialModules = [
  MatAutocompleteModule, MatChipsModule, MatFormFieldModule, ReactiveFormsModule, MatCheckboxModule
]

@NgModule({
  imports: [
    AceEditorModule,
    CommonModule,
    SharedAppModule,
    adminRouting,
    ...materialModules
  ],
  declarations: [
    AdminComponent,
    AdminOverviewComponent,
    CreateBlockLanguageComponent,
    CreateGrammarComponent,
    EditBlockLanguageComponent,
    EditActualParametersComponent,
    EditInputParameterValueComponent,
    EditGrammarComponent,
    EditTraitScopesComponent,
    ErrorListComponent,
    EditSingleTraitScopeComponent,
    LinkGrammarComponent,
    JsonEditor,
    OverviewGrammarComponent,
    OverviewBlockLanguageComponent,
    AdminNewsListComponent,
    AdminNewsEditComponent,
  ],
  providers: [
    JsonSchemaValidationService
  ],
  exports: [
  ]
})
export class AdminModule { }
