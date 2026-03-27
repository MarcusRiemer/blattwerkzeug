import { Component, Inject } from "@angular/core";

import { map } from "rxjs/operators";

import { CodeResource } from "../../shared/syntaxtree";
import {
  FixedBlocksSidebarDescription,
  FixedBlocksSidebar,
} from "../../shared/block";

import { SIDEBAR_MODEL_TOKEN } from "../editor.token";
import { CodeHighlightService } from "./code-highlight.service";
import { CurrentHoleLocationService } from "../current-hole-location.service";
import { RenderedCodeResourceService } from "./block/rendered-coderesource.service";
import { CurrentCodeResourceService } from "../current-coderesource.service";

@Component({
  templateUrl: "templates/sidebar-fixed-blocks.html",
  selector: "code-sidebar-fixed-blocks",
})
export class CodeSidebarFixedBlocksComponent {
  constructor(
    @Inject(SIDEBAR_MODEL_TOKEN)
    public readonly codeResource: CodeResource,
    private codeHighlightService: CodeHighlightService,
    private currentHoleLocationService: CurrentHoleLocationService,
    private renderedDataService: CurrentCodeResourceService
  ) {}

  readonly currentBlockLanguage$ = this.codeResource.blockLanguage$;

  readonly fixedBlockSidebars$ = this.currentBlockLanguage$.pipe(
    map((b) =>
      b.sidebarDesriptions
        .filter(
          (s): s is FixedBlocksSidebarDescription => s.type === "fixedBlocks"
        )
        .map(
          (s) =>
            new FixedBlocksSidebar(
              s,
              this.codeHighlightService,
              this.currentHoleLocationService,
              this.renderedDataService
            )
        )
    )
  );
}
