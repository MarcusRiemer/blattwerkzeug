import { FormsModule } from "@angular/forms";
import { TestBed } from "@angular/core/testing";
import { MatLegacySnackBarModule as MatSnackBarModule } from "@angular/material/legacy-snack-bar";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";

import { first } from "rxjs/operators";

import { ApolloTestingModule } from "apollo-angular/testing";

import {
  FullGrammarGQL,
  FullProjectGQL,
} from "../../../../../generated/graphql";

import { BlockLanguage } from "../../../../shared/block";
import { FocusDirective } from "../../../../shared/focus-element.directive";
import {
  LanguageService,
  NodeDescription,
  SyntaxTree,
  CodeResource,
  GrammarDocument,
} from "../../../../shared";
import { ServerApiService } from "../../../../shared/serverdata";
import { ResourceReferencesService } from "../../../../shared/resource-references.service";
import { generateBlockLanguage } from "../../../../shared/block/generator/generator";
import { BlockLanguageListDescription } from "../../../../shared/block/block-language.description";
import {
  AnalyticsService,
  SpecAnalyticsService,
} from "../../../../shared/analytics.service";

import { DragService } from "../../../drag.service";
import { TrashService } from "../../../trash.service";
import {
  specCacheBlockLanguage,
  specBuildBlockLanguageDescription,
  specBuildGrammarDescription,
  specCacheGrammar,
} from "../../../spec-util";
import { CurrentCodeResourceService } from "../../../current-coderesource.service";

import { RenderedCodeResourceService } from "../rendered-coderesource.service";
import { BlockHostComponent } from "../block-host.component";
import { BLOCK_RENDER_COMPONENTS } from "../index";
import { mkGrammarDoc } from "src/app/shared/syntaxtree/grammar.spec-util";

describe(`Render Generated BlockLanguages`, () => {
  async function createComponent(
    nodeDesc: NodeDescription,
    grammarDoc: GrammarDocument
  ) {
    await TestBed.configureTestingModule({
      imports: [
        ApolloTestingModule,
        FormsModule,
        MatSnackBarModule,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        DragService,
        FullGrammarGQL,
        LanguageService,
        RenderedCodeResourceService,
        CurrentCodeResourceService,
        TrashService,
        ServerApiService,
        FullProjectGQL,
        ResourceReferencesService,
        {
          provide: AnalyticsService,
          useClass: SpecAnalyticsService,
        },
      ],
      declarations: [...BLOCK_RENDER_COMPONENTS, FocusDirective],
    }).compileComponents();

    const grammarDesc = specCacheGrammar(
      specBuildGrammarDescription(grammarDoc)
    );
    const listBlockLanguage: BlockLanguageListDescription =
      specBuildBlockLanguageDescription({
        grammarId: grammarDesc.id,
      });
    const genBlockLanguage = specBuildBlockLanguageDescription(
      Object.assign(
        {},
        listBlockLanguage,
        generateBlockLanguage(
          {
            type: "tree",
          },
          grammarDoc
        )
      )
    );

    const blockLangDesc = specCacheBlockLanguage(genBlockLanguage);

    let fixture = TestBed.createComponent(BlockHostComponent);
    let component = fixture.componentInstance;

    // The component instantiates the service for the particular subtree. I had a loooong
    // search for nasty bugs because this basic assumption didn't hold, so I will leave
    // the expectation enabled just as a warning to myself.
    //
    // The cast to "any" is a hack to remove the private-ness of the injected service.
    const renderData = (component as any)
      ._renderedCodeResourceService as RenderedCodeResourceService;
    expect(renderData)
      .withContext("Spec and component must share same service")
      .toBe((component as any)._renderedCodeResourceService);

    const blockLanguage = new BlockLanguage(blockLangDesc);

    const codeResource = new CodeResource(
      {
        ast: nodeDesc,
        name: "Spec",
        id: "spec",
        blockLanguageId: blockLanguage.id,
        programmingLanguageId: blockLangDesc.defaultProgrammingLanguageId,
      },
      undefined
    );

    component.node = new SyntaxTree(nodeDesc).rootNode;
    component.blockLanguage = blockLanguage;
    component.codeResource = codeResource;

    await renderData._updateRenderData(codeResource, blockLanguage, false, {});

    fixture.detectChanges();
    await fixture.whenStable();

    const httpTestingController = TestBed.inject(HttpTestingController);
    httpTestingController.verify();

    const serviceRenderDataAvailable = await renderData.dataAvailable$
      .pipe(first())
      .toPromise();
    const componentRenderDataAvailable = await component.renderDataAvailable$
      .pipe(first())
      .toPromise();

    expect(componentRenderDataAvailable)
      .withContext("Component render data must be available")
      .toBe(true);
    expect(serviceRenderDataAvailable)
      .withContext("Service render data must be available")
      .toBe(true);

    expect(component.node)
      .withContext("Component must have a valid node")
      .not.toBeUndefined();
    expect(component.codeResource)
      .withContext("Component must have a valid code resource")
      .not.toBeUndefined();
    expect(component.blockLanguage)
      .withContext("Component must have a valid block language")
      .not.toBeUndefined();

    await fixture.whenRenderingDone();

    return {
      fixture,
      component,
      componentRenderDataAvailable,
      blockLanguage,
      codeResource,
      element: fixture.nativeElement as HTMLElement,
    };
  }

  describe(`Grammar 0: Root with single required child`, () => {
    const grammarDesc: GrammarDocument = mkGrammarDoc(
      { languageName: "l", typeName: "r" },
      {
        foreignTypes: {},
        types: {
          l: {
            r: {
              type: "concrete",
              attributes: [
                {
                  type: "allowed",
                  name: "c",
                  nodeTypes: [{ languageName: "l", typeName: "t1" }],
                },
              ],
            },
            t1: {
              type: "concrete",
              attributes: [{ type: "terminal", symbol: "t1" }],
            },
          },
        },
      }
    );

    it(`Child provided`, async () => {
      const treeDesc: NodeDescription = {
        language: "l",
        name: "r",
        children: {
          c: [
            {
              language: "l",
              name: "t1",
            },
          ],
        },
      };

      const c = await createComponent(treeDesc, grammarDesc);

      expect(c.element.innerText)
        .withContext("Root node must appear somewhere")
        .toMatch(/noder/);

      expect(c.element.innerText)
        .withContext("Child node must appear somewhere")
        .toMatch(/nodet1/);
    });

    it(`Child missing`, async () => {
      const treeDesc: NodeDescription = {
        language: "l",
        name: "r",
        children: {
          c: [],
        },
      };

      const c = await createComponent(treeDesc, grammarDesc);

      expect(c.element.innerText)
        .withContext("Root node must appear somewhere")
        .toMatch(/noder/);
    });
  });

  describe(`Grammar 1: Root with single required child in container`, () => {
    const grammarDesc: GrammarDocument = mkGrammarDoc(
      { languageName: "l", typeName: "r" },
      {
        foreignTypes: {},
        types: {
          l: {
            r: {
              type: "concrete",
              attributes: [
                {
                  type: "container",
                  orientation: "vertical",
                  children: [
                    {
                      type: "allowed",
                      name: "c",
                      nodeTypes: [{ languageName: "l", typeName: "t1" }],
                    },
                  ],
                },
              ],
            },
            t1: {
              type: "concrete",
              attributes: [{ type: "terminal", symbol: "t1" }],
            },
          },
        },
      }
    );

    it(`Child provided`, async () => {
      const treeDesc: NodeDescription = {
        language: "l",
        name: "r",
        children: {
          c: [
            {
              language: "l",
              name: "t1",
            },
          ],
        },
      };

      const c = await createComponent(treeDesc, grammarDesc);

      expect(c.element.innerText)
        .withContext("Root node must appear somewhere")
        .toMatch(/noder/);

      expect(c.element.innerText)
        .withContext("Child node must appear somewhere")
        .toMatch(/nodet1/);
    });

    it(`Child missing`, async () => {
      const treeDesc: NodeDescription = {
        language: "l",
        name: "r",
        children: {
          c: [],
        },
      };

      const c = await createComponent(treeDesc, grammarDesc);

      expect(c.element.innerText)
        .withContext("Root node must appear somewhere")
        .toMatch(/noder/);
    });
  });

  describe(`Grammar 2: Empty child group with space-around`, () => {
    const grammarDesc: GrammarDocument = mkGrammarDoc(
      { languageName: "l", typeName: "r" },
      {
        foreignTypes: {},
        types: {
          l: {
            r: {
              type: "concrete",
              attributes: [
                {
                  type: "allowed",
                  name: "c",
                  tags: ["space-around"],
                  nodeTypes: [{ languageName: "l", typeName: "t1" }],
                },
              ],
            },
            t1: {
              type: "concrete",
              attributes: [{ type: "terminal", symbol: "t1" }],
            },
          },
        },
      }
    );

    it(`Empty group still hosts space-around`, async () => {
      const treeDesc: NodeDescription = {
        language: "l",
        name: "r",
        children: {
          c: [],
        },
      };

      const c = await createComponent(treeDesc, grammarDesc);
      const hosts = c.element.querySelectorAll(
        "editor-block-render-drop-target"
      );

      expect(hosts.length)
        .withContext("An empty group keeps its trailing drop target")
        .toBe(1);
      expect(hosts[0].classList)
        .withContext("The grammar tag is painted on that host")
        .toContain("space-around");
    });
  });
});
