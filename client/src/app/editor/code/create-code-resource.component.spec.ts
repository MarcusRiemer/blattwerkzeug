import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { RouterTestingModule } from "@angular/router/testing";

import { MatLegacySnackBar as MatSnackBar } from "@angular/material/legacy-snack-bar";
import { Overlay } from "@angular/cdk/overlay";

import {
  ApolloTestingController,
  ApolloTestingModule,
} from "apollo-angular/testing";

import {
  CreateCodeResourceDocument,
  FullBlockLanguageGQL,
  FullGrammarGQL,
  FullProjectGQL,
  NameBlockLanguageGQL,
} from "../../../generated/graphql";

import {
  specBuildBlockLanguageDescription,
  specCacheBlockLanguage,
  specLoadProject,
} from "../../editor/spec-util";

import { ResourceReferencesService } from "../../shared/resource-references.service";

import { ServerApiService, LanguageService } from "../../shared";
import { MayPerformService } from "../../shared/authorisation/may-perform.service";
import { CodeResourceDescription } from "../../shared/syntaxtree";
import { EmptyComponent } from "../../shared/empty.component";
import { PerformDataService } from "../../shared/authorisation/perform-data.service";
import { specExpectMayPerform } from "../../shared/authorisation/may-perform.spec-util";
import { MayPerformComponent } from "../../shared/authorisation/may-perform.component";
import { DisplayResourcePipe } from "../../shared/display-resource.pipe";
import { FullBlockLanguage } from "../../shared/serverdata/gql-cache";

import { EditorToolbarService } from "../toolbar.service";
import { SidebarService } from "../sidebar.service";
import { ProjectService } from "../project.service";
import { CodeResourceService } from "../coderesource.service";
import { RegistrationService } from "../registration.service";

import { CreateCodeResourceComponent } from "./create-code-resource.component";
import { getOperationName } from "@apollo/client/utilities";
import { specGqlWaitQuery } from "../spec-util/gql-respond-query.spec";

describe(`CreateCodeResourceComponent`, () => {
  async function createComponent(
    blockLanguages: FullBlockLanguage[] = [],
    permissionToCreate: boolean = true
  ) {
    await TestBed.configureTestingModule({
      imports: [
        ApolloTestingModule,
        FormsModule,
        RouterTestingModule.withRoutes([
          { path: ":id", component: EmptyComponent },
        ]),
        HttpClientTestingModule,
      ],
      providers: [
        LanguageService,
        ServerApiService,
        RegistrationService,
        EditorToolbarService,
        SidebarService,
        ProjectService,
        CodeResourceService,
        FullGrammarGQL,
        MatSnackBar,
        Overlay,
        ResourceReferencesService,
        FullProjectGQL,
        FullBlockLanguageGQL,
        NameBlockLanguageGQL,
        PerformDataService,
        MayPerformService,
      ],
      declarations: [
        CreateCodeResourceComponent,
        EmptyComponent,
        MayPerformComponent,
        DisplayResourcePipe,
      ],
    }).compileComponents();

    blockLanguages.forEach(specCacheBlockLanguage);

    const projectService = TestBed.inject(ProjectService);

    const projectId = "19846df6-2839-4368-a888-7ce620c53346";
    const project = await specLoadProject(projectService, {
      id: projectId,
      projectUsesBlockLanguages: blockLanguages.map((b) => ({
        __typename: "ProjectUsesBlockLanguage",
        blockLanguageId: b.id,
        id: projectId,
      })),
      blockLanguages,
    });

    const fixture = TestBed.createComponent(CreateCodeResourceComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // Allow or deny creation operation
    specExpectMayPerform(
      {
        input: {
          policyAction: "update",
          resourceType: "Project",
          resourceId: projectId,
        },
      },
      permissionToCreate
    );

    // Don't allow educational aspects
    specExpectMayPerform(
      {
        input: {
          policyAction: "educational",
          resourceType: "Project",
          resourceId: projectId,
        },
      },
      false
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return {
      fixture,
      component,
      rootElement: fixture.nativeElement as HTMLElement,
      blockLangSelectElement: () =>
        fixture.nativeElement.querySelector("select"),
      projectService,
      project,
      httpTesting: TestBed.inject(HttpTestingController),
      serverApi: TestBed.inject(ServerApiService),
      apolloTesting: TestBed.inject(ApolloTestingController),
    };
  }

  it(`Has empty inputs without data`, async () => {
    let t = await createComponent([], true);

    expect(t.component.blockLanguageId).toBeUndefined();
    expect(t.component.resourceName).toBeUndefined();
  });

  it(`Has empty inputs when not allowed to create`, async () => {
    let t = await createComponent([], false);

    expect(t.component.blockLanguageId).toBeUndefined();
    expect(t.component.resourceName).toBeUndefined();
  });

  it(`Shows the default block language`, async () => {
    const id = "cbc49d11-40e5-4ab6-9549-64959488c1eb";

    let t = await createComponent(
      [
        specBuildBlockLanguageDescription({
          id,
          name: "B1",
          defaultProgrammingLanguageId: "spec",
          grammarId: "4330b41a-294b-43be-b1d0-679df35a7c87",
        }),
      ],
      true
    );

    expect(t.component.blockLanguageId).toEqual(id);
    expect(t.blockLangSelectElement().selectedOptions[0].innerText).toContain(
      "B1"
    );
  });

  it(`Shows the first availabe block language as default`, async () => {
    const b = specBuildBlockLanguageDescription();

    let t = await createComponent(
      [
        b,
        specBuildBlockLanguageDescription(), // Two languages available
      ],
      true
    );

    expect(t.component.blockLanguageId).toEqual(b.id);
  });

  it(`Creating a new resource results in a HTTP request and a redirect`, async () => {
    const b = specBuildBlockLanguageDescription();
    const t = await createComponent([b]);

    const r: CodeResourceDescription = {
      id: "a292fae1-aad7-4cfe-9646-6210a6814eab",
      name: "Test",
      blockLanguageId: b.id,
      ast: undefined,
      createdAt: "",
      programmingLanguageId: "spec",
      updatedAt: "",
    };

    // Setup a name and call the creation method
    t.component.resourceName = r.name;
    const created = t.component.createCodeResource();

    // Mimic a successful response
    const op = await specGqlWaitQuery(
      (m) => m.operationName === getOperationName(CreateCodeResourceDocument)
    );

    op.flush({
      data: {
        createCodeResource: {
          codeResource: r,
        },
      },
    });

    // Ensure the creation has actually happened
    await created;

    // There should be a new resource in the project now
    expect(t.project.codeResources).not.toEqual([]);
    expect(t.project.codeResources[0].name).toEqual(r.name);

    const router = TestBed.inject(Router);
    expect(router.url).toEqual("/" + r.id);
  });
});
