require_dependency 'error'

class ApplicationController < ActionController::API
  include ActionController::HttpAuthentication::Basic::ControllerMethods

  # Handle all errors that are specifc to our parts of the code
  rescue_from EsqulinoError, :with => :handle_internal_exception

  # Hand out 404 errors as fallbacks if Active Record doesn't find something
  rescue_from ActiveRecord::RecordNotFound, :with => :handle_record_not_found

  protected

  # An instance of EsqulinoError was thrown
  def handle_internal_exception(exception)
    Raven.capture_exception(exception)

    # Handle errors that might be seen by users with a slightly nicer
    # representation than pure JSON.
    if exception.is_a? EsqulinoMessageError then
      @exception = exception
      @admin_mail = Rails.configuration.sqlino["mail"]["admin"]

      render template: "static_files/message_error", layout: "application_error"
    else
      # Simply react to internal errors by presenting them in a JSON representation
      render status: exception.code, json: exception.to_liquid
    end
  end

  # Active record couldn't find a specific record
  def handle_record_not_found
    render status: 404, plain: ""
  end
end
