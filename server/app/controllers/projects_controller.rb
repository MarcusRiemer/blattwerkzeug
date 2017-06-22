require 'project'

class ProjectsController < ApplicationController
  # Enumerating all available projects
  def index
    projects = enumerate_projects(Rails.application.config.sqlino[:projects_dir], false, true)
                 .map { |project| project.public_description }
    
    render json: projects
  end

  # Retrieving a single project
  def show
    render json: current_project
  end

  # The preview image for a specific project
  def preview_image
    send_file current_project.preview_image_path, disposition: 'inline'
  end

  private

  # Loads the currently requested project
  def current_project
    projects_dir = Rails.application.config.sqlino[:projects_dir]
    
    project = Project.new File.join(projects_dir, params['project_id']), false
  end
end
