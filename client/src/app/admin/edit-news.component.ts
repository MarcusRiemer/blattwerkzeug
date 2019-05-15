import { SimpleChanges, ElementRef } from '@angular/core';
import { AfterViewInit, OnChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, OnInit, LOCALE_ID, Inject, ViewChild, TemplateRef } from '@angular/core';
import { first } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material';

import { NewsUpdateDescription } from '../shared/news.description';
import { ServerDataService, ToolbarService } from '../shared';

/**
 * Administrative UI to edit or create news.
 */
@Component({
  templateUrl: './templates/edit-news.html'
})
export class AdminNewsEditComponent implements OnInit {
  @ViewChild('toolbarItems') toolbarItems: TemplateRef<any>;

  constructor(
    private _serverData: ServerDataService,
    private _activeRoute: ActivatedRoute,
    private _router: Router,
    private _serverService: ServerDataService,
    private _snackBar: MatSnackBar,
    private _toolbar: ToolbarService,
    @Inject(LOCALE_ID) private readonly localeID: string,
  ) { }

  // ID of the news being edited
  private readonly _newsId = this._activeRoute.snapshot.paramMap.get('newsId');

  // Current query parameters of the route
  private readonly _queryParams = this._activeRoute.snapshot.queryParams;

  readonly editors = [
    { name: 'single', description: 'Einfacher Bearbeitungsmodus' },
    { name: 'translation', description: 'Übersetzungsmodus' },
  ]

  public newsData: NewsUpdateDescription;
  public ableToPublish: boolean;
  public readonly queryParamsLanguage = this._queryParams.language || this.localeID;
  public queryParamsMode = this._queryParams.mode || 'single';

  public ngOnInit(): void {
    // Add these specific toolbar items to the global toolbar
    this._toolbar.addItem(this.toolbarItems)

    // Provide something to edit
    if (this.isCreatingNews) {
      // Create a new news to be edited
      this.newNews()
    } else {
      // Retrieve the news that should be edited
      this._serverData.getAdminNewsSingle.getDescription(this._newsId).pipe(
        first()
      ).subscribe(
        news => this.newsData = news,
        err => alert(err),
        () => { this.ableToPublish = this.isPublished }
      );
    }
  }

  /**
   * Creates a new news which is ready to be edited.
   */
  public newNews(): void {
    this.newsData = {
      title: {},
      text: {},
      publishedFrom: null // Field needs to be sent, even if empty
    };
  }

  /**
   * undefined = isn't able to publish,
   * null = is able to publish but there's no valid value
   */
  public checkCheckboxPublishFrom(): void {
    if (!this.ableToPublish)
      this.newsData.publishedFrom = undefined
    else
      if (this.newsData.publishedFrom == undefined)
        this.newsData.publishedFrom = null

  }

  get isCreatingNews(): boolean {
    return this._newsId == undefined || this._newsId == null
  }

  get isPublished(): boolean {
    return this.newsData.publishedFrom !== undefined && this.newsData.publishedFrom !== null;
  }

  get isDateValid(): boolean {
    return this.newsData.publishedFrom !== null
  }

  /**
   * Send our new news to the server.
   */
  onCreate(): void {
    this.checkCheckboxPublishFrom();
    if (this.isDateValid) {
      this._serverService.createNews(this.newsData).subscribe(
        _ => {
          this._router.navigate(['admin/news']);
          this._snackBar.open('Created succesful', '', { duration: 3000 });
        },
        err => alert(`Error: ${JSON.stringify(err)}`)
      );
    }
  }

  /**
   * Update the news on the server.
   *
   * @param option May be "redirect" to redirect the user back to the overview page
   */
  public onUpdate(option: string): void {
    this.checkCheckboxPublishFrom();
    if (this.isDateValid) {
      this._serverService.updateNews(this._newsId , this.newsData).subscribe(
        _ => {
          if (option == "redirect")
            this._router.navigate(['admin/news'])

          this._snackBar.open('Updated succesful', '', { duration: 3000 });
        },
        err => alert(`Error: ${JSON.stringify(err)}`)
      );
    }
  }

  /**
   * Delete the news on the server.
   */
  public onDelete(): void {
    let question = confirm('Ganze Nachricht löschen?')
    if (question) {
      this._serverService.deleteNews(this._newsId).subscribe(
        _ => {
          this._router.navigate(['admin/news']);
          this._snackBar.open('Deleted succesful', '', { duration: 3000 });
        },
        err => alert(`Error: ${JSON.stringify(err)}`)
      );
    }
  }
}