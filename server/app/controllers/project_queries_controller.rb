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
      sql = IdeService.guaranteed_instance.emit_code(sql_ast, sql_ast['language'], request_data['grammar_id'])
      result = database.execute_sql(sql, request_data['params'], preview_max_rows)

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
end
