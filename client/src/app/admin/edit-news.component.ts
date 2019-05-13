import { SimpleChanges, ElementRef } from '@angular/core';
import { AfterViewInit, OnChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, OnInit, LOCALE_ID, Inject, ViewChild, TemplateRef } from '@angular/core';
import { first } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material';

import { AdminNewsDescription } from '../shared/news.description';
import { ServerDataService, ToolbarService } from '../shared';

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

  private readonly _id = this._activeRoute.snapshot.paramMap.get('newsId');
  private readonly _queryParams = this._activeRoute.snapshot.queryParams;

  readonly editors = [
    {name: 'single',  description: 'Einfacher Bearbeitungsmodus'},
    {name: 'translation',  description: 'Übersetzungsmodus'},
  ]

  public newsData: AdminNewsDescription;
  public ableToPublish: boolean;
  public readonly queryParamsLanguage = this._queryParams.language || this.localeID;
  public queryParamsMode = this._queryParams.mode || 'single';

  public ngOnInit(): void {
    this._toolbar.addItem(this.toolbarItems)
    if (this.isCreatingNews) {
      this.newNews()
    } else {
      this._serverData.getAdminNewsSingle.getDescription(this._id).pipe(
        first()
      ).subscribe(
        news => this.newsData = news,
        err => alert(err),
        () => { this.ableToPublish = this.isPublished }
      );
    }
  }

  public newNews(): void {
    this.newsData = {
      id: '',
      title: {},
      text: {},
      publishedFrom: undefined,
      createdAt: '',
      updatedAt: ''
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
    return this._id == undefined || this._id == null
  }

  get isPublished(): boolean {
    return this.newsData.publishedFrom !== undefined && this.newsData.publishedFrom !== null;
  }

  get isDateValid(): boolean {
    return this.newsData.publishedFrom !== null
  }

  createNews(): void {
    this.checkCheckboxPublishFrom();
    if (this.isDateValid) {
      this._serverService.createNews(this.newsData).subscribe(
        _ => {
          this._router.navigate(['admin/news']);
          this._snackBar.open('Created succesful', '', { duration: 3000 });
        },
        _ => alert('Please select a valid date')
      );
    }
  }

  public updateData(option: string): void {
    this.checkCheckboxPublishFrom();
    if (this.isDateValid) {
      this._serverService.updateNews(this.newsData).subscribe(
        _ => {
          if (option == "redirect")
            this._router.navigate(['admin/news'])

          this._snackBar.open('Updated succesful', '', { duration: 3000 });
        },
        _ => alert('Please select a valid date')
      );
    }
  }

  public deleteNews(): void {
    let question = confirm('Ganze Nachricht löschen ?')
    if (question) {
      this._serverService.deleteNews(this._id).subscribe(
        _ => {
          this._router.navigate(['admin/news']);
          this._snackBar.open('Deleted succesful', '', { duration: 3000 });
        },
        _ => alert(`Can´t delete the news with the id: ${this._id}`)
      );
    }
  }
}