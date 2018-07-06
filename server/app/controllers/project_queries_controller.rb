# All actions that concern queries that are part of a project
class ProjectQueriesController < ApplicationController
  include ProjectsHelper
  include JsonSchemaHelper

  # The maximum number of rows a preview may contain
  def preview_max_rows
    100
  end

  # Allows the execution of arbitrary SQL, which might be a little
  # dangerous ;)   
  def run_arbitrary
    request_data = ensure_request("ArbitraryQueryRequestDescription", request.body.read)

    project = Project.find_by!(slug: params['project_id'])
    database_id = nil # params['database_id']
    database = project.database_by_id_or_default(database_id)
    
    sql_ast = request_data['ast']
    begin
      sql = IdeService.guaranteed_instance.emit_code(sql_ast, sql_ast['language'])
      result = database.execute_sql(sql, request_data['params'])

      if result['rows'].length > preview_max_rows then
        result['rows'] = result['rows'].first preview_max_rows
      end
      
      render json: result
    end
  end

  # Running a query that has already been stored on the server
  def run_stored    
    query_params = ensure_request("QueryParamsDescription", request.body.read)
    
    result = current_query.execute(query_params)
    render json: result
  end

  # Simulates the execution of an INSERT SQL query
  def run_simulated_insert
    request_data = ensure_request("ArbitraryQueryRequestDescription", request.body.read)

    result = self.current_project.simulate_insert_sql(request_data['sql'], request_data['params'])
    render json: result
  end

  # Simulates the execution of a DELETE SQL query
  def run_simulated_delete
    request_data = ensure_request("ArbitraryQueryRequestDescription", request.body.read)

    result = self.current_project.simulate_delete_sql(request_data['sql'], request_data['params'])
    render json: result
  end

  # Creating a new query
  def create
    @current_query = LegacyQuery.new current_project, nil
    self.update
  end

  # Storing a query
  def update
    ensure_write_access do  
      new_query = ensure_request("QueryUpdateRequestDescription", request.body.read)

      # Update whatever representation is currently loaded. If this is a new query
      # the ID has been autogenerated, otherwise this ist the "old" id which we dont touch.
      current_query.model = new_query['model']
      current_query.sql = new_query['sql']

      current_query.save!

      render json: current_query.id
    end
  end

  # Deleting a query
  def destroy
    ensure_write_access do  
      current_query.delete!
      render status: 200
    end
  end

end
