# This constraint kicks in for every project subdomain that should
# be rendered.
class RenderProjectConstraint
  def project_domains
    Rails.configuration.sqlino[:project_domains] || []
  end

  def matches?(request)
    (self.project_domains.include? request.domain) or (not ['', 'www'].include? request.subdomain)
  end
end

Rails.application.routes.draw do
  # First stop: We might need to render a project for an end user
  constraints RenderProjectConstraint.new do
    root via: [:get, :post], controller: 'render_projects', action: :render_page

    # TODO: find out how to represent this with a single route
    get '*path/favicon.ico', controller: 'render_projects', action: :favicon
    get '/favicon.ico', controller: 'render_projects', action: :favicon

    # Catch all requests for static files that are provided upstream
    get '/vendor/*path', format: false, controller: 'render_projects', action: :vendor_file

    # Running a query
    post '/(:page_name_or_id/)query/:query_id', controller: 'render_projects', action: :run_query

    # We assume these are pages
    match '*page_name_or_id', via: [:get, :post], controller: 'render_projects', action: :render_page
  end

  # Second stop: The API for the editor
  scope '/api' do
    scope 'project' do
      root via: [:get], controller: 'projects', action: :index
      root via: [:post], controller: 'projects', action: :create
      root via: [:delete], controller: 'projects', action: :destroy

      # Everything that does something in the context of a specific project
      scope ':project_id' do
        root controller: 'projects', action: :show
        root via: [:post], controller: 'projects', action: :edit
        root via: [:delete], controller: 'projects', action: :destroy

        get 'preview', controller: 'projects', action: :preview_image

        # Everything that does something with the database content via a query
        scope 'query' do
          root via: [:post], controller: 'project_queries', action: :create
          post 'run', controller: 'project_queries', action: :run_arbitrary

          scope ':query_id' do
            root via: [:post], controller: 'project_queries', action: :update
            root via: [:delete], controller: 'project_queries', action: :destroy
            post 'run', controller: 'project_queries', action: :run_stored
          end
        end

        # Everything that does something with the pages
        scope 'page' do
          root via: [:post], controller: 'project_pages', action: :create
          post 'render', controller: 'project_pages', action: :render_arbitrary

          scope ':page_id' do
            root via: [:post], controller: 'project_pages', action: :update
            root via: [:delete], controller: 'project_pages', action: :destroy

            get 'render', controller: 'project_pages', action: :render_known
          end
        end

        # Everything that has something to do with images
        scope 'image' do
          root via: [:post], controller: 'project_images', action: :create

          scope ':image_id' do
            root via: [:get], controller: 'project_images', action: :file_show
            root via: [:post], controller: 'project_images', action: :file_update
            root via: [:delete], controller: 'project_images', action: :file_delete

            get  'metadata', controller: 'project_images', action: :metadata_show
            post 'metadata', controller: 'project_images', action: :metadata_update
          end
        end

        # Everything that does something with the database schema
        scope 'db/:database_id' do
          get 'visual_schema', controller: 'project_databases', action: :visual_schema

          # Querying table data
          get 'count/:tablename', controller: 'project_databases', action: :table_row_count
          get 'rows/:tablename/:from/:amount', controller: 'project_databases', action: :table_row_data

          # Altering the schema
          post 'alter/:tablename', controller: 'project_databases', action: :table_alter
          delete 'drop/:tablename', controller: 'project_databases', action: :table_delete
          post 'create', controller: 'project_databases', action: :table_create
        end
      end
    end

    # Fallback for unknown API endpoints
    match '*path', via: :all, to: proc { [404, {}, ["Unknown API endpoint"]] }
  end

  # Third stop:  Serving static files and the index.html on development machines
  # These paths are not meant to be called when running in production
  root action: :index, controller: 'static_files'
  get '*path', action: :index, controller: 'static_files'
end
