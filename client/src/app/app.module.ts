import { APOLLO_OPTIONS } from "apollo-angular";
import { HttpLink } from "apollo-angular/http";
import { ApolloClientOptions, InMemoryCache } from "@apollo/client/core";
import { NgModule, ErrorHandler, PLATFORM_ID, Inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { BrowserModule, Title } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { Router, NavigationEnd } from "@angular/router";

import { Angulartics2Module } from "angulartics2";

import { filter } from "rxjs/operators";

import * as Sentry from "@sentry/browser";
import * as Integrations from "@sentry/integrations";

import { environment } from "../environments/environment";

import { SharedAppModule } from "./shared/shared.module";
import { urlParamsFromObject } from "./shared/util-browser";

import { FrontModule } from "./front/front.module";

import { SqlScratchComponent } from "./app.component";
import { routing } from "./app.routes";

import { NotifyErrorHandler, isApplicationCrashed } from "./error-handler";
import { NaturalLanguagesService } from "./natural-languages.service";
import { LinkService } from "./link.service";

import registerLanguages from "./locale-registration";
import { UserModule } from "./user/user.module";

// Ensure the Piwik client object is globally available
declare var _paq: any[];
if (typeof window !== "undefined") {
  var _paq = typeof (window as any)._paq === "undefined" ? [] : _paq;
  (window as any)._paq = _paq;
}

registerLanguages();

// Configure Sentry error reporting (if enabled)
if (environment.sentry && environment.sentry.active) {
  const options: Sentry.BrowserOptions = {
    dsn: environment.sentry.dsn,
    environment: environment.production ? "production" : "development",
    release: environment.version.hash,
    integrations: [new Integrations.Angular()],
  };

  // Possibly also show a helpful dialogue
  if (environment.sentry.showDialogue) {
    options.beforeSend = (event) => {
      // Ensure that only the first dialog is ever shown.
      if (!isApplicationCrashed()) {
        Sentry.showReportDialog({
          dsn: options.dsn,
        });
      }
      return event;
    };
  }

  Sentry.init(options);
}

@NgModule({
  imports: [
    // Angular Core, universal rendering enabled
    BrowserModule.withServerTransition({
      appId: "scratch-sql",
    }),
    BrowserAnimationsModule,

    // Tracking with Piwik
    Angulartics2Module.forRoot(),

    // Actual Application
    SharedAppModule.forRoot(),
    FrontModule,
    UserModule,
    routing,
  ],
  declarations: [SqlScratchComponent],
  providers: [
    { provide: ErrorHandler, useClass: NotifyErrorHandler },
    Title,
    { provide: ErrorHandler, useClass: NotifyErrorHandler },
    LinkService,
    NaturalLanguagesService,
    {
      provide: APOLLO_OPTIONS,
      useFactory: (httpLink: HttpLink): ApolloClientOptions<any> => ({
        connectToDevTools: true,
        cache: new InMemoryCache({
          typePolicies: {
            Query: {
              fields: {
                blockLanguage: (_, { toReference, variables }) => {
                  if (variables?.id) {
                    //console.debug("blockLanguage: toReference", variables);
                    return toReference({
                      __typename: "BlockLanguage",
                      id: variables.id,
                    });
                  }
                },
              },
            },
          },
        }),

        link: httpLink.create({
          // Don't send the query string over the wire
          includeQuery: false,
          // Put name of operation in URL to ease debugging
          uri: ({ operationName, variables }) =>
            `/api/graphql/${operationName}}`,
        }),
        defaultOptions: {
          mutate: {
            errorPolicy: "all",
          },
          query: {
            errorPolicy: "all",
          },
          watchQuery: {
            errorPolicy: "all",
          },
        },
      }),
      deps: [HttpLink],
    },
  ],
  bootstrap: [SqlScratchComponent],
  exports: [SharedAppModule],
})
export class AppModule {
  constructor(
    @Inject(PLATFORM_ID) platformId: string,
    private readonly _router: Router,
    private readonly _naturalLanguagesService: NaturalLanguagesService
  ) {
    // Calling service methods that need to be called exactly once
    this.setupTracking(platformId);
    this.setupDocumentLanguage();
  }

  private setupDocumentLanguage() {
    this._naturalLanguagesService.updateRootLangAttribute();

    // Ensure that the alternate languages are always mentioned in the <head>
    this._router.events
      .pipe(filter((evt) => evt instanceof NavigationEnd))
      .subscribe((_) => {
        this._naturalLanguagesService.updateAlternateUrls();
      });
  }

  private setupTracking(platformId: string) {
    // Setting up Piwik if there is a configuration and we are running in the browser
    const piwikConf = environment.piwik;
    if (piwikConf?.active && isPlatformBrowser(platformId)) {
      // Basic tracking settings
      _paq.push(["setTrackerUrl", piwikConf.host + "/piwik.php"]);
      _paq.push(["setSiteId", piwikConf.id]);

      // Loading piwik.js
      const g = document.createElement("script");
      const s = document.getElementsByTagName("script")[0];
      g.type = "text/javascript";
      g.async = true;
      g.defer = true;
      g.src = piwikConf.host + "/piwik.js";
      s.parentNode.insertBefore(g, s);

      console.log(
        `Piwik Tracking initialized for ID ${piwikConf.id} at "${piwikConf.host}"`
      );
    }
  }
}
