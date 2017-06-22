# Servers known static files or falls back to the index.html if the
# file that is asked for is not known
class StaticFilesController < ApplicationController
  def index
    # Assume that the URL immediatly denotes a file we know
    basepath = Rails.configuration.sqlino[:client_dir]
    requested_path = URI.parse(request.original_url).path[1..-1]
    local_path = basepath.join(requested_path)

    # If we don't know that file, assume that the index file
    # was requested
    if requested_path.empty? or not File.exists? local_path then
      local_path = basepath.join('index.html')
    end
    
    send_file local_path, disposition: 'inline'
  end
end
