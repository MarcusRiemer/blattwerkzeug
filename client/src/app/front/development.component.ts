import { Component, Inject, LOCALE_ID } from '@angular/core'
import { of } from 'rxjs';

import { ProjectProposals } from './academica-data/project-proposals'
import { MultiLangString } from '../shared/nav-interfaces';

interface DevelopmentLink {
  icon: string;
  title: MultiLangString;
  subtitle: MultiLangString;
  href: string;
  content: MultiLangString;
}

// Online resources where development happens
const DevelopmentLinks: DevelopmentLink[] = [
  {
    icon: "bitbucket",
    title: {
      "de": "Quelltext Einsehen",
      "en": "View Sourceode"
    },
    subtitle: {
      "de": "Als Git-Repository bei BitBucket",
      "en": "As Git-repository on BitBucket"
    },
    content: {
      "de": `Der Quelltext lässt sich sowohl online betrachten als auch mit git ausschecken.`,
      "en": `The source code may be browsed online or checked out with git.`
    },
    href: "https://bitbucket.org/marcusriemer/esqulino/"
  },
  {
    icon: "trello",
    title: {
      "de": "Feature-Planung",
      "en": "Feature-Planning"
    },
    subtitle: {
      "de": "Als Kanban-Board bei Trello",
      "en": "As Kanban-Board at Trello"
    },
    content: {
      "de": `An welchen Features wird gerade gearbeitet? Wer macht eigentlich was? Diese organisatorischen Fragen werden mit dem Kanban-Board geklärt.`,
      "en": `Which feature is currently being worked on? Who is working on what? These organisational questions are organised with Trello.`
    },
    href: "https://trello.com/b/vQ5vkMpV/esqulino"
  },
  {
    icon: "check-circle-o",
    title: {
      "de": "Continous Integration Pipeline",
      "en": "Continous Integration Pipeline"
    },
    subtitle: {
      "de": "Via Azure DevOps und Docker-Images",
      "en": "Via Azure DevOps and Docker-imaeges"
    },
    content: {
      "de": `Kompiliert das Projekt noch nach meinem letzten Commit? Laufen die Testfälle noch durch? Der CI-Dienst läuft nach jedem "push" und findet es heraus.`,
      "en": `Did my last commit break anything for the build? Do the tests still run? The CI-service runs after every push and finds out.`
    },
    href: "https://dev.azure.com/marcusriemer/BlattWerkzeug/_build"
  }
]

/**
 * Information for developers that might want to contribute to the project.
 */
@Component({
  templateUrl: 'templates/development.html',
})
export class DevelopmentComponent {
  constructor(
    @Inject(LOCALE_ID) readonly localeId: string
  ) { }

  readonly projectProposals = of(ProjectProposals.filter(p => p.language === this.localeId));

  readonly developmentLinks = of(DevelopmentLinks);
}
