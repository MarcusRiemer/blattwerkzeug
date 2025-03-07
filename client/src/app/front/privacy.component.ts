import { Component } from "@angular/core";

import { environment } from "../../environments/environment";

@Component({
  templateUrl: "templates/privacy.html",
})
export class PrivacyComponent {
  readonly hasPiwik = environment.piwik?.active;
  readonly hasSentry = environment.sentry?.active;
}
