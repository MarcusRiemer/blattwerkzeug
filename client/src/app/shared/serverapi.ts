/**
 * Instead of constructing URLs on the fly, they should be created using
 * this service. It ensures that the server actually provides the
 * capatabilities to respond to the request, abstracts away the concrete
 * URL to call and can do some basic parameter checks.
 *
 * This file is manually kept in sync with the rails route definitions
 * at `server/config/routes.rb`.
 *
 * TODO: Cleanup code so that these methods rely on each other instead
 *       of constructing the same base-url over and over again.
 */
export class ServerApi {
  protected static BASE_HOST = "http://www.blattwerkzeug.de";

  public constructor(
    protected _apiBaseUrl: string
  ) {
  }

  /**
   * Retrieves a specific schema
   */
  individualJsonSchemaUrl(name: string): string {
    return (`${this._apiBaseUrl}/schema/${name}`)
  }

  /**
   * Retrieves the URL that is used to list all public block languages.
   */
  getBlockLanguageListUrl(): string {
    return (`${this._apiBaseUrl}/block_languages`)
  }

  /**
   * Retrieves the full description of a specific block language.
   */
  individualBlockLanguageUrl(id: string): string {
    return (`${this._apiBaseUrl}/block_languages/${id}`);
  }

  /**
   * Allows creation of new block languages
   */
  createBlockLanguageUrl(): string {
    return (`${this._apiBaseUrl}/block_languages`);
  }

  /**
   * Retrieves the URL that is used to list all public grammars
   */
  getGrammarListUrl(): string {
    return (`${this._apiBaseUrl}/grammars`)
  }

  /**
   * Retrieves the full description of a specific grammar.
   *
   * @param idOrSlug The slug or the ID of the grammar in question.
   */
  individualGrammarUrl(idOrSlug: string) {
    return (`${this._apiBaseUrl}/grammars/${idOrSlug}`)
  }

  /**
   * Retrieves block languages that are related to this grammar
   */
  individualGrammarRelatedBlockLanguagesUrl(id: string) {
    return (`${this.individualGrammarUrl(id)}/related_block_languages`)
  }

  /**
   * Retrieves the URL that is used to list all public block language generators.
   */
  getBlockLanguageGeneratorListUrl(): string {
    return (`${this._apiBaseUrl}/block_language_generators`)
  }

  /**
   * Retrieves the URL that is used to list all public projects.
   */
  getProjectListUrl(): string {
    return (`${this._apiBaseUrl}/project`)
  }

  /**
   * Retrieves the URL that uniquely describes a project.
   */
  getProjectUrl(projectId: string): string {
    return (`${this._apiBaseUrl}/project/${projectId}`);
  }

  /**
   * Retrieves the url to create a new project
   */
  createProjectUrl(): string {
    return (`${this._apiBaseUrl}/project`);
  }

  /**
   * The base URL for all operations on code resources
   */
  getCodeResourceBaseUrl(projectId: string): string {
    return this.getProjectUrl(projectId) + '/code_resources';
  }

  /**
   * Retrieves the URL to access code resources
   */
  getCodeResourceUrl(projectId: string, codeResourceId: string): string {
    return this.getCodeResourceBaseUrl(projectId) + `/${codeResourceId}`
  }

  /**
   * Retrieves an URL that can be used to run requests
   * where the ID is transfered as part of the body.
   */
  getQueryUrl(projectId: string): string {
    return (`${this._apiBaseUrl}/project/${projectId}/query/`);
  }

  /**
   * Retrieves an URL that can be used to run requests
   * where the ID is transferred as part of the request string.
   */
  getQuerySpecificUrl(projectId: string, queryId: string): string {
    return (`${this._apiBaseUrl}/project/${projectId}/query/${queryId}`);
  }

  /**
   * Formats an URL that can be used to run a specific query on the
   * server.
   */
  getSpecificRunQueryUrl(projectId: string, queryId: string): string {
    return (`${this._apiBaseUrl}/project/${projectId}/query/${queryId}/run`);
  }

  /**
   * Retrieves the URL that is used to run an arbitrary
   * query against a certain project. This may not be allowed by the
   * server if the client is not authorized.
   */
  getRunQueryUrl(projectId: string): string {
    return (`${this._apiBaseUrl}/project/${projectId}/query/run`);
  }

  /**
   * Retrieves the URL that is used to run simulate the effects of an INSERT
   * query against a certain project.
   */
  getSimulateInsertUrl(projectId: string): string {
    return (`${this._apiBaseUrl}/project/${projectId}/query/simulate/insert`);
  }

  /**
   * Retrieves the URL that is used to run simulate the effects of an DELETE
   * query against a certain project.
   */
  getSimulateDeleteUrl(projectId: string): string {
    return (`${this._apiBaseUrl}/project/${projectId}/query/simulate/delete`);
  }

  /**
   * Retrieves an URL that can be used to create pages.
   *
   * @projectId The ID of the project
   */
  getPageUrl(projectId: string): string {
    return (`${this._apiBaseUrl}/project/${projectId}/page`);
  }

  /**
   * Retrieves an URL that can be used to access specific pages.
   *
   * @projectId The ID of the project
   * @pageId The ID of the page. Omitted if undefined.
   */
  getPageSpecificUrl(projectId: string, pageId: string): string {
    if (!pageId) {
      return (this.getPageUrl(projectId));
    } else {
      return (`${this.getPageUrl(projectId)}/${pageId}`);
    }
  }

  /**
   * Retrieves an URL that can be used to render specific pages.
   *
   * @projectId The ID of the project
   * @pageId The ID of the query
   */
  getPageRenderUrl(projectId: string, pageId: string): string {
    return (this.getPageSpecificUrl(projectId, pageId) + "/render/");
  }

  /**
   * Retrieves an URL that can be used to render arbitrary pages.
   *
   * @projectId The ID of the project
   */
  getArbitraryRenderUrl(projectId: string): string {
    return (this.getProjectUrl(projectId) + "/page/render");
  }

  /**
   * Retrieves the URL that can be used to upload new images.
   *
   * @projectId The ID of the project
   */
  getImageUploadUrl(projectId: string): string {
    return (this.getProjectUrl(projectId) + "/image");
  }

  getImageListUrl(projectId: string): string {
    return (this.getProjectUrl(projectId)) + "/image";
  }

  getImageMetadataUrl(projectId: string, imageId: string): string {
    return (this.getProjectUrl(projectId)) + "/image/" + imageId + "/metadata";
  }

  getImageUrl(projectId: string, imageId: string): string {
    return (this.getProjectUrl(projectId)) + "/image/" + imageId
  }

  getImageDeleteUrl(projectId: string, imageId: string): string {
    return (this.getProjectUrl(projectId)) + "/image/" + imageId
  }

  /**
   * Retrieves an URL that can be used to get entries
   * of a table.
   *
   * @projectId The ID of the project
   * @tableName The name of the table
   * @from The first entry to get
   * @amount The amount of entries to get
   */
  getTableEntriesUrl(projectId: string, database_id: string, tableName: string, from: number, amount: number): string {
    return (this.getProjectUrl(projectId) + `/db/${database_id}/rows/${tableName}/${from}/${amount}`);
  }

  /**
   * Retrieves an URL that can be used to get the amount of
   * entries inside a table.
   *
   * @projectId The ID of the project
   * @tableName The name of the table
   */
  getTableEntriesCountUrl(projectId: string, database_id: string, tableName: string): string {
    return (this.getProjectUrl(projectId) + `/db/${database_id}/count/${tableName}`);
  }

  /**
   * Retrieves an URL that can be used to post a TableDescription
   * to create a corresponding table.
   *
   * @projectId The ID of the project
   * @database_id The name of the database
   */
  getCreateTableUrl(projectId: string, database_id: string): string {
    return (this.getProjectUrl(projectId) + `/db/${database_id}/create`);
  }

  /**
   * Retrieves an URL that can be used to drop a Table
   * inside the database.
   *
   * @projectId The ID of the project
   * @tableName The name of the table
   * @database_id The name of the database
   */
  getDropTableUrl(projectId: string, database_id: string, tableName: string): string {
    return (this.getProjectUrl(projectId) + `/db/${database_id}/drop/${tableName}`);
  }

  /**
   * Retrieves an URL that can be used to alter a Table
   * inside the database, by sending an array of TableCommands.
   *
   * @projectId The ID of the project
   * @tableName The name of the table to alter
   * @database_id The name of the database
   */
  getTableAlterUrl(projectId: string, database_id: string, tableName: string): string {
    return (this.getProjectUrl(projectId) + `/db/${database_id}/alter/${tableName}`);
  }
}
