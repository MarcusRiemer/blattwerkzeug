import { TestBed } from "@angular/core/testing";
import { MatLegacySnackBarModule as MatSnackBarModule } from "@angular/material/legacy-snack-bar";
import { RouterTestingModule } from "@angular/router/testing";

import { LinkGrammarComponent } from "./link-grammar.component";
import { generateUUIDv4 } from "../shared/util-browser";
import {
  ApolloTestingController,
  ApolloTestingModule,
} from "apollo-angular/testing";
import { buildSingleGrammarResponse } from "../editor/spec-util/grammar.admin-data.spec";
import { AdminListGrammarsDocument } from "../../generated/graphql";

describe("LinkGrammarComponent", () => {
  async function createComponent(grammarId: string = undefined) {
    await TestBed.configureTestingModule({
      imports: [ApolloTestingModule, MatSnackBarModule, RouterTestingModule],
      declarations: [LinkGrammarComponent],
    }).compileComponents();

    let fixture = TestBed.createComponent(LinkGrammarComponent);
    let component = fixture.componentInstance;

    component.grammarId = grammarId;

    fixture.detectChanges();
    await fixture.whenRenderingDone();

    const controller = TestBed.inject(ApolloTestingController);

    return {
      fixture,
      component,
      controller,
      element: fixture.nativeElement as HTMLElement,
    };
  }

  it(`Can be instantiated`, async () => {
    const t = await createComponent();

    expect(t.component).toBeDefined();
  });

  it(`Renders ID if no other data is available`, async () => {
    const id = generateUUIDv4();
    const t = await createComponent(id);

    expect(t.element.innerText.trim()).toEqual(id);
    expect(t.element.querySelector("a").href).toContain(id);
  });

  it(`Renders the name once the data is available`, async () => {
    const response = buildSingleGrammarResponse({ name: "spec" });
    const grammar = response.data.grammars.nodes[0];
    const t = await createComponent(grammar.id);

    await t.fixture.whenStable();
    t.fixture.detectChanges();

    expect(t.element.innerText.trim()).toEqual(grammar.id);
    expect(t.element.querySelector("a").href).toContain(grammar.id);

    t.controller.expectOne(AdminListGrammarsDocument).flush(response);

    await t.fixture.whenStable();
    t.fixture.detectChanges();

    expect(t.element.innerText.trim()).toEqual(grammar.name);
    expect(t.element.querySelector("a").href).toContain(grammar.id);
  });
});
