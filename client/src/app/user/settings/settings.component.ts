import { SideNavService } from './../../shared/side-nav.service';
import { Component, AfterViewChecked } from "@angular/core";

import { NavItem } from '../../shared/nav-interfaces';

export const userSettings: NavItem[] = [
  {
    type: "link",
    text: {
      de: "Account",
      en: "Account",
    },
    route: ["/user/settings/account"],
    icon: "user",
  },
  {
    type: "fill"
  },
  {
    type: "external",
    text: {
      de: "Anleitung 🇬🇧",
      en: "Manual 🇬🇧",
    },
    url: "http://manual.blattwerkzeug.de/",
    icon: "book"
  },
];

@Component({
  templateUrl: './templates/settings-index.html'
})
export class UserSettingsComponent implements AfterViewChecked {
  constructor(
    private _sideNav: SideNavService
  ) {}

  ngAfterViewChecked(): void {
    this._sideNav.newSideNav(userSettings)
  }
}