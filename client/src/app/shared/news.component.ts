import { Component, Inject, LOCALE_ID } from "@angular/core";

import { UserNewsDescription } from './syntaxtree/news.description';
import { ServerDataService } from './serverdata/server-data.service';

@Component({
  selector: 'news-list',
  templateUrl: './templates/news.html'
})
export class NewsComponent {
  constructor(
    @Inject(LOCALE_ID) private readonly _localeId: string,
    private _serverData: ServerDataService)
  {
    this.userNewsList.value.subscribe(list => {
      console.log(list)
    })
  }

  readonly userNewsList = this._serverData.getUserNewsList;
  readonly locale = this._localeId;
}