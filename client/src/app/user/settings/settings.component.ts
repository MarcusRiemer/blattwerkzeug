import { SideNavService } from './../../shared/side-nav.service';
import { Component, OnInit } from "@angular/core";

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
    type: "link",
    text: {
      de: "Sicherheit",
      en: "Security",
    },
    route: ["/user/settings/security"],
    icon: "shield",
  },
  {
    type: "link",
    text: {
      de: "E-Mails",
      en: "E-Mails",
    },
    route: ["/user/settings/email"],
    icon: "envelope",
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
export class UserSettingsComponent implements OnInit {
  constructor(
    private _sideNav: SideNavService
  ) {}

  ngOnInit(): void {
    this._sideNav.newSideNav(userSettings)
  }
}