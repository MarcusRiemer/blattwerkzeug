import { Component, Inject } from "@angular/core";

import { map } from "rxjs/operators";

import { CodeResource } from "../../shared/syntaxtree";
import {
  FixedBlocksSidebarDescription,
  FixedBlocksSidebar,
} from "../../shared/block";

import { SIDEBAR_MODEL_TOKEN } from "../editor.token";
import { CurrentCodeResourceService } from "../current-coderesource.service";

@Component({
  templateUrl: "templates/sidebar-fixed-blocks.html",
  selector: "code-sidebar-fixed-blocks",
})
export class CodeSidebarFixedBlocksComponent {
  constructor(
    @Inject(SIDEBAR_MODEL_TOKEN)
    public readonly codeResource: CodeResource,
    public readonly currentCodeResource: CurrentCodeResourceService
  ) {}

  readonly currentBlockLanguage$ = this.codeResource.blockLanguage$;

  readonly fixedBlockSidebars$ = this.currentBlockLanguage$.pipe(
    map((b) =>
      b.sidebarDesriptions
        .filter(
          (s): s is FixedBlocksSidebarDescription => s.type === "fixedBlocks"
        )
        .map((s) => new FixedBlocksSidebar(s,this.currentCodeResource))
    )
  );
}
