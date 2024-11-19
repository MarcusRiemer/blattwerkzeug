import { HttpClientTestingModule } from "@angular/common/http/testing";
import { ApolloTestingModule } from "apollo-angular/testing";

import { TestBed } from "@angular/core/testing";

import {
  FullBlockLanguageGQL,
  FullGrammarGQL,
  FullProjectGQL,
} from "src/generated/graphql";
import { LanguageService } from "../shared/language.service";
import {
  ErrorCodes,
  NodeDescription,
  ServerApiService,
  ValidationContext,
  Validator,
} from "../shared";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Overlay } from "@angular/cdk/overlay";

import { ProjectService } from "./project.service";
import { ResourceReferencesService } from "../shared/resource-references.service";
import { CurrentCodeResourceService } from "./current-coderesource.service";
import { FixedSidebarBlock } from "../shared/block";
import {
  specBuildBlockLanguageDescription,
  specLoadProject,
  specProvideBlockLanguageResponse,
  specProvideGrammarResponse,
} from "./spec-util";
import { GRAMMAR_SQL_DESCRIPTION } from "../shared/syntaxtree/grammar.spec.sql";
import { first } from "rxjs/operators";

describe(`CurrentCodersourceService`, () => {
  async function instantiate(
    ast: NodeDescription
  ): Promise<CurrentCodeResourceService> {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ApolloTestingModule],
      providers: [
        FullProjectGQL,
        LanguageService,
        ServerApiService,
        ProjectService,
        FullGrammarGQL,
        MatSnackBar,
        Overlay,
        ResourceReferencesService,
        FullBlockLanguageGQL,
        ResourceReferencesService,
        CurrentCodeResourceService,
      ],
      declarations: [],
    });

    const projectService = TestBed.inject(ProjectService);
    const currentCodeResourceService = TestBed.inject(
      CurrentCodeResourceService
    );

    //Everything that follows is set at the Beginning, when the testproject is instantiated
    //Determines the used Block Language for the Tests -  needs an ID and a grammar ID, that determines the used grammar from the grammar.spec
    const blockLanguageDescription = specBuildBlockLanguageDescription({
      id: "1",
      grammarId: GRAMMAR_SQL_DESCRIPTION.id,
    });
    //Determins the parameters for the used Grammar. There is no spec with default values for most of this
    const grammarDescription = {
      //setting of default values
      ...GRAMMAR_SQL_DESCRIPTION,
      createdAt: "",
      updatedAt: "",
      //remnant from an older feature where the part in the programm that is being run gets highlighted
      visualizes: [],
      includes: [],
      //set Block language id here should be the same as in the block language description
      blockLanguages: [{ id: "1", name: "Test Block Language" }],
      generatedFromId: null,
      slug: "sql",
    };
    await specLoadProject(projectService, {
      codeResources: [
        {
          blockLanguageId: "1",
          id: "2",
          name: "test Code",
          programmingLanguageId: "sql",
          ast: ast,
        },
      ],
      grammars: [grammarDescription],
      blockLanguages: [blockLanguageDescription],
    });
    specProvideBlockLanguageResponse(blockLanguageDescription);
    specProvideGrammarResponse(grammarDescription);

    const cr = projectService.cachedProject.getCodeResourceById("2");
    currentCodeResourceService._changeCurrentResource(cr);
    const v = await currentCodeResourceService.validator$
      .pipe(first())
      .toPromise();
    expect(v).toBeDefined();
    return currentCodeResourceService;
  }
  it(`can be instantiated`, async () => {
    const s = await instantiate({
      language: "sql",
      name: "querySelect",
    });
    expect(s).toBeDefined();
    expect(s.peekResource).toBeDefined();
    expect(await s.resourceBlockLanguageId.pipe(first()).toPromise()).toEqual(
      "1"
    );
    expect(await s.blockLanguage$.pipe(first()).toPromise()).toBeDefined();
    expect(s.peekSyntaxtree).toBeDefined();
  });

  it(`can set the hole location`, async () => {
    const s = await instantiate({
      language: "sql",
      name: "querySelect",
    });

    s.setCurrentHoleLocation([]);
    expect(await s.currentHoleLocation$.pipe(first()).toPromise()).toEqual([]);
  });

  it(`can locate the root node`, async () => {
    const s = await instantiate({
      language: "sql",
      name: "querySelect",
    });

    console.log(s.peekSyntaxtree.toModel());

    expect(await s.peekSyntaxtree.locateOrUndefined([])).toBe(
      s.peekSyntaxtree.rootNode
    );
  });

  describe(`.currentHoleMatchesBlock(block)`, () => {
    //TODO: Für diese Fälle ein describe mit treeDesc schreiben
    it(`shows only Blocks with A`, async () => {
      const s = await instantiate({
        language: "sql",
        name: "querySelect",
      });

      const block: FixedSidebarBlock = new FixedSidebarBlock({
        displayName: "ANY",
        defaultNode: {
          name: "*",
          language: "sql",
        },
      });

      const result = await s.currentHoleMatchesBlock(block);
      expect(result).toBeTrue();
    });

    it(`does not show Blocks without A`, async () => {
      const s = await instantiate({
        language: "sql",
        name: "querySelect",
      });

      const block: FixedSidebarBlock = new FixedSidebarBlock({
        displayName: "FROM",
        defaultNode: {
          name: "*",
          language: "sql",
        },
      });

      const result = await s.currentHoleMatchesBlock(block);
      expect(result).toBeFalse();
    });

    describe(`Tree with 2 Holes sql: query select without FROM and SELECT`, () => {
      const treeDesc = {
        name: "querySelect",
        language: "sql",
        children: {
          from: [
            {
              name: "from",
              language: "sql",
            },
          ],
          where: [],
          select: [
            {
              name: "select",
              language: "sql",
            },
          ],
          groupBy: [],
        },
      };

      it(`fills SELECT with *`, async () => {
        const s = await instantiate(treeDesc);

        const block: NodeDescription = {
          name: "starOperator",
          language: "sql",
        };
        s.setCurrentHoleLocation([
          ["select", 0],
          ["columns", 0],
        ]);
        expect(await s.peekSyntaxtree.locate([])).toBe(
          s.peekSyntaxtree.rootNode
        );
        expect(await s.peekSyntaxtree.locate([["select", 0]])).toBe(
          s.peekSyntaxtree.rootNode.children["select"][0]
        );

        const result = await s.currentHoleMatchesBlock(block);
        expect(result).toBeTrue();
      });

      it(`fills SELECT with Function Sum`, async () => {
        const s = await instantiate(treeDesc);

        const block: NodeDescription = {
          name: "functionCall",
          language: "sql",
          properties: {
            name: "SUM",
          },
        };
        s.setCurrentHoleLocation([
          ["select", 0],
          ["columns", 0],
        ]);
        expect(await s.peekSyntaxtree.locate([])).toBe(
          s.peekSyntaxtree.rootNode
        );
        expect(await s.peekSyntaxtree.locate([["select", 0]])).toBe(
          s.peekSyntaxtree.rootNode.children["select"][0]
        );

        const result = await s.currentHoleMatchesBlock(block);
        expect(result).toBeTrue();
      });
    });

    //FILL ONE HOLE IN SELECT FROM WITH VALID BLOCKS
    //Expressions
    describe("Tree with 1 hole sql: query with only one Hole in ast at SELECT", () => {
      const treeDescOneHole = {
        name: "querySelect",
        language: "sql",
        children: {
          from: [
            {
              name: "from",
              language: "sql",
              children: {
                tabels: [
                  {
                    name: "tableIntroduction",
                    language: "sql",
                    properties: {
                      name: "geschichte",
                    },
                  },
                ],
              },
            },
          ],
          where: [],
          select: [
            {
              name: "select",
              language: "sql",
            },
          ],
          groupBy: [],
        },
      };

      it(`Fills SELECT Hole with * Block`, async () => {
        const s = await instantiate(treeDescOneHole);

        const block: NodeDescription = {
          name: "starOperator",
          language: "sql",
        };
        s.setCurrentHoleLocation([
          ["select", 0],
          ["columns", 0],
        ]);
        expect(await s.peekSyntaxtree.locate([["select", 0]])).toBe(
          s.peekSyntaxtree.rootNode.children["select"][0]
        );
        const result = await s.currentHoleMatchesBlock(block);
        expect(result).toBeTrue();
      });

      it(`Fills SELECT Hole with PARAM Block`, async () => {
        const s = await instantiate(treeDescOneHole);

        const block: NodeDescription = {
          name: "parameter",
          language: "sql",
          properties: {
            name: "param",
          },
        };
        s.setCurrentHoleLocation([
          ["select", 0],
          ["columns", 0],
        ]);
        expect(await s.peekSyntaxtree.locate([["select", 0]])).toBe(
          s.peekSyntaxtree.rootNode.children["select"][0]
        );
        const result = await s.currentHoleMatchesBlock(block);
        expect(result).toBeTrue();
      });

      it(`Fills SELECT Hole with Konst Block`, async () => {
        const s = await instantiate(treeDescOneHole);

        const block: NodeDescription = {
          name: "constant",
          language: "sql",
          properties: {
            value: "wert",
          },
        };
        s.setCurrentHoleLocation([
          ["select", 0],
          ["columns", 0],
        ]);
        expect(await s.peekSyntaxtree.locate([["select", 0]])).toBe(
          s.peekSyntaxtree.rootNode.children["select"][0]
        );
        const result = await s.currentHoleMatchesBlock(block);
        expect(result).toBeTrue();
      });

      it(`Fills SELECT Hole with Binary Expression Block`, async () => {
        const s = await instantiate(treeDescOneHole);

        const block: NodeDescription = {
          name: "binaryExpression",
          language: "sql",
          children: {
            lhs: [],
            rhs: [],
            operator: [
              {
                name: "relationalOperator",
                language: "sql",
                properties: {
                  operator: "=",
                },
              },
            ],
          },
        };
        s.setCurrentHoleLocation([
          ["select", 0],
          ["columns", 0],
        ]);
        expect(await s.peekSyntaxtree.locate([["select", 0]])).toBe(
          s.peekSyntaxtree.rootNode.children["select"][0]
        );
        const result = await s.currentHoleMatchesBlock(block);
        expect(result).toBeTrue();
      });
      //Fills SELECT WiTH non Valid Block

      it(`Fills SELECT Hole with WHERE block`, async () => {
        const s = await instantiate(treeDescOneHole);

        const block: NodeDescription = {
          name: "where",
          language: "sql",
        };

        s.setCurrentHoleLocation([
          ["select", 0],
          ["columns", 0],
        ]);

        const result = await s.currentHoleMatchesBlock(block);
        expect(result).toBeFalse();
      });

      //Funktions
      it(`Fills the SELECT Hole with a COUNT() Block`, async () => {
        const s = await instantiate(treeDescOneHole);

        const block: NodeDescription = {
          name: "functionCall",
          language: "sql",
          properties: {
            name: "COUNT",
          },
        };
        s.setCurrentHoleLocation([
          ["select", 0],
          ["columns", 0],
        ]);

        const result = await s.currentHoleMatchesBlock(block);
        expect(result).toBeTrue();
      });

      it(`returns true when Hole is filled with a Block that only returns MISSING_CHILD Error`, async () => {
        const s = await instantiate(treeDescOneHole);
        const block: NodeDescription = {
          name: "functionCall",
          language: "sql",
          properties: {
            name: "SUM",
          },
        };
        s.setCurrentHoleLocation([
          ["select", 0],
          ["columns", 0],
        ]);

        const result = await s.currentHoleMatchesBlock(block);

        expect(result).toBeTrue();
      });

      it(`returns true when Hole is filled with a block that returns no Error`, async () => {
        const s = await instantiate(treeDescOneHole);
        const block: NodeDescription = {
          name: "parameter",
          language: "sql",
          properties: {
            name: "param",
          },
        };
        s.setCurrentHoleLocation([
          ["select", 0],
          ["columns", 0],
        ]);

        const result = await s.currentHoleMatchesBlock(block);

        expect(result).toBeTrue();
      });

      it(`returns false when Hole is filled with an invalid block`, async () => {
        const s = await instantiate(treeDescOneHole);

        const block: NodeDescription = {
          name: "where",
          language: "sql",
        };
        s.setCurrentHoleLocation([
          ["select", 0],
          ["columns", 0],
        ]);

        const result = await s.currentHoleMatchesBlock(block);

        expect(result).toBeFalse();
      });

      //Inseting this Block throws MISSING_CHILD Error
      describe(`Tree with 2 Holes`, () => {
        const treeDescTwoHoles = {
          name: "querySelect",
          language: "sql",
          children: {
            from: [
              {
                name: "from",
                language: "sql",
                children: {
                  tables: [
                    {
                      name: "tableIntroduction",
                      language: "sql",
                      properties: {
                        name: "geschichte",
                      },
                    },
                  ],
                },
              },
            ],
            where: [
              {
                name: "where",
                language: "sql",
                children: {
                  expressions: [],
                },
              },
            ],
            select: [
              {
                name: "select",
                language: "sql",
                children: {
                  columns: [],
                },
              },
            ],
            groupBy: [],
          },
        };

        it(`returns false after inserting a valid Block becaus of another error`, async () => {
          const s = await instantiate(treeDescTwoHoles);

          const block: NodeDescription = {
            name: "binaryExpression",
            language: "sql",
            children: {
              lhs: [
                {
                  name: "columnName",
                  language: "sql",
                  properties: {
                    columnName: "id",
                    refTableName: "charakter",
                  },
                },
              ],
              rhs: [],
              operator: [
                {
                  name: "relationalOperator",
                  language: "sql",
                  properties: {
                    operator: "=",
                  },
                },
              ],
            },
          };
          s.setCurrentHoleLocation([
            ["where", 0],
            ["expressions", 0],
          ]);
          const result = await s.currentHoleMatchesBlock(block);

          expect(result).toBeFalse();
        });
      });
    });
  });
});
