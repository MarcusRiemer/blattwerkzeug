import { Component } from '@angular/core'
import { Platform } from '@angular/cdk/platform';

/**
 * A clickable internal link in the side navigation.
 */
export interface NavLink {
  type: "link",
  text: string, // The text to display
  route: string[],
  icon?: string
}

/**
 * A clickable external link in the side navigation.
 */
export interface NavLinkExternal {
  type: "external",
  text: string, // The text to display
  url: string,
  icon?: string
}

/**
 * A faint horizontal divider
 */
export interface NavDivider {
  type: "divider"
}

/**
 * Fills space and pushes other content as far away as possible
 */
export interface NavFill {
  type: "fill"
}


/**
 * A non-interactive caption text
 */
export interface NavHeader {
  type: "header",
  text: string
}

export type NavItem = NavLink | NavDivider | NavFill | NavLinkExternal | NavHeader;

@Component({
  templateUrl: 'templates/index.html',
})
export class FrontComponent {

  constructor(public readonly platform: Platform) { }

  /**
   * El cheapo platform detection. Used to possibly hide various UI
   * elements on mobile.
   */
  readonly isMobile = this.platform.IOS || this.platform.ANDROID;

  /**
   * All items that need to be shown in the general navigation
   */
  readonly navItems: NavItem[] = [
    {
      type: "link",
      text: "Hauptseite",
      route: ["/about/"],
      icon: "home"
    },
    {
      type: "link",
      text: "Beispielprojekte",
      route: ["/about/projects"],
      icon: "cubes"
    },
    {
      type: "divider"
    },
    {
      type: "link",
      text: "Forschung",
      route: ["/about/academia"],
      icon: "flask"
    },
    {
      type: "link",
      text: "Impressum",
      route: ["/about/imprint"],
      icon: "file-text-o"
    },
    {
      type: "link",
      text: "Datenschutz",
      route: ["/about/privacy"],
      icon: "user-secret"
    },
    {
      type: "fill"
    },
    {
      type: "header",
      text: "Administration",
    },
    {
      type: "link",
      text: "Sprachen",
      route: ["/admin"],
      icon: "puzzle-piece"
    },
    {
      type: "external",
      text: "Manual 🇬🇧",
      url: "http://manual.blattwerkzeug.de/",
      icon: "book"
    },
  ];
}
