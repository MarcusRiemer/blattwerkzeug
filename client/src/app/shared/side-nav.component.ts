import { UserService } from './auth/user.service';
import { Component, Inject, LOCALE_ID, Input, ViewChild } from "@angular/core";
import { BrowserService } from './browser.service';
import { MatSidenav } from '@angular/material';

import { NavItem } from './nav-interfaces';
import { SideNavService } from './side-nav.service';



@Component({
  selector: 'side-nav-selector',
  templateUrl: './templates/side-nav.html'
})

export class SideNavComponent {
  @Input('items') navItems: NavItem[];

  @ViewChild('sideNav', { static: false }) sidenav: MatSidenav;

  /**
   * Used for dependency injection
   */
  constructor(
    @Inject(LOCALE_ID) private readonly _localeId: string,
    private readonly _browser: BrowserService,
    private readonly _sideNav: SideNavService,
    private readonly _userService: UserService
  ) {
    this._sideNav.sideNavItems$()
      .subscribe(navItems => this.navItems = navItems)

    this._sideNav.sideNavToggle$()
      .subscribe(() => this.sidenav.toggle())

  }

  // Checks if the user is logged in
  readonly loggedIn$ = this._userService.isLoggedIn$;

  // Pass through: Mobile device detection
  readonly isMobile$ = this._browser.isMobile$;

  // Pass through: Rendering mode for sidebar
  readonly sidebarMode$ = this._browser.sidebarMode$;

  // The actual locale that is currently in use
  readonly locale = this._localeId;
}
