require 'open3'

# Common functionality for all IDE operations, no matter whether
# they are routed through the "exec" or the "systemd" supervisor.
class BaseIdeService
  include JsonSchemaHelper

  # Emits the source code for the given tree in the given language.
  #
  # @param tree_description [Hash]
  #   The JSON-description of the syntaxtree to emit.
  #
  # @param language_id [string]
  #   The id of the language to use
  #
  # @param grammar_id [string]
  #   The id of the language to use
  #
  # @return [string]
  #   The string representation of the syntaxtree. If the given tree
  #   is nil, the returned object is also nil.
  def emit_code(tree_description, language_id, grammar_id)
    if (tree_description)
      execute_request({
                        "type" => "emitCode",
                        "ast" => tree_description,
                        "languageId" => language_id,
                        "grammarId" => grammar_id
                      })
    else
      nil
    end
  end

  # Emits the block visualization instructions for the given block
  # language.
  def emit_generated_blocks(block_language)
    generator_description = block_language.local_generator_instructions
    if (generator_description)
      # Ensure for all documents that wee are not passing in any garbage
      ensure_valid_document(
        "BlockLanguageGeneratorDocument",
        generator_description
      )
      grammar_description = ensure_valid_document(
        "GrammarDocument",
        block_language.grammar.document.transform_keys { |k| k.camelize(:lower) }
      )

      # All documents seem fine, lets execute the request
      json_result = execute_request({
                                      "type" => "emitGeneratedBlocks",
                                      "generator" => generator_description,
                                      "grammar" => grammar_description
                                    })

      return json_result.transform_keys { |k| k.underscore }
    else
      nil
    end
  end

  # Converts the given AST into a "proper" settings for a block language
  # (the settings are every aspect of the language without the blocks).
  def emit_block_lang_settings(block_lang_desc_ast)
    ensure_valid_document(
      "NodeDescription",
      block_lang_desc_ast
    )

    # All documents seem fine, lets execute the request
    json_result = execute_request({
                                    "type" => "emitBlockLanguageSettings",
                                    "metaBlockLanguage" => block_lang_desc_ast
                                  })

    return json_result.transform_keys { |k| k.underscore }
  end

  # Finds out which other resources are referenced by the given
  # code resource
  # @param code_resource [CodeResource]
  #   The code resource that is analyzed
  # @param search_type ["referencedCodeResources"|"referencedGrammars"]
  def referenced_resource_ids(code_resource, search_type)
    grammar_document = code_resource
                       .block_language
                       .grammar
                       .document
                       .transform_keys { |k| k.camelize(:lower) }
    execute_request({
                      "type" => search_type,
                      "ast" => code_resource.ast,
                      "grammar" => grammar_document
                    })
  end

  # Checks whether the IDE-service is available
  def ping!
    execute_request({ "type" => "ping" }) == "pong"
  end

  # Communicates the given request to the IDE service.
  #
  # @param request [hash]
  #  A request object for the CLI, must at least specify the
  #  "type" property.
  # @return Depends on the type of the request
  def execute_request(request)
    ActiveSupport::Notifications.instrument('request.ide_service', request: request) do
      self.execute_request_impl(request)
    end
  end

  # Actual implementation of call to the IDE service. Needs to be
  # implemented by the deriving classes.
  #
  # @param request [hash]
  #  A request object for the CLI, must at least specify the
  #  "type" property.
  # @return Depends on the type of the request
  def execute_request_impl(request)
    raise "execute_request not implemented"
  end

  # The path to the cli program
  def cli_program_path
    raise "cli_program_path not implemented"
  end

  # Checks whether the given program actually exists
  def cli_program_exists?
    File.exist? cli_program_path
  end

  # Ensures the node runtime has something meaningful to start
  def assert_cli_program_exists!
    if not cli_program_exists?
      raise EsqulinoError::IdeService, "Could not find compiled CLI at \"#{@program}\""
    end
  end

  # Waits until the cli program is available
  def wait_cli_program_exists!
    wait_time = 2.seconds
    sum_wait_time = 0
    max_wait_time = 30 * wait_time

    # Wait until the program magically appears
    while not cli_program_exists?
      # Are we patient enough to continue waiting
      if sum_wait_time < max_wait_time
        # Yes, possibly print a warning why startup is delayed and then wait
        if sum_wait_time == 0
          puts "Waiting for CLI-program at \"#{cli_program_path}\""
        end

        sleep wait_time
        sum_wait_time += wait_time
      else
        raise EsqulinoError::IdeService, "Could not find compiled CLI at \"#{cli_program_path}\""
      end
    end

    # Now the program must exist
    assert_cli_program_exists!
  end
end

# This service starts a node program under the control of
# the server.
class ExecIdeService < BaseIdeService
  # Pulls the required paths from the Rails configuration
  def initialize(config: nil)
    @node_binary = config[:node_binary]
    @program = config[:program]
  end

  # The path to the cli program
  def cli_program_path
    @program
  end
end

# Re-executes the CLI service for every single request.
class OneShotExecIdeService < ExecIdeService
  # Executes the request in a service that is started
  # exclusively for this request.
  #
  # @param request [hash]
  #  A request object for the CLI, must at least specify the
  #  "type" property.
  # @return Depends on the type of the request
  def execute_request_impl(request)
    assert_cli_program_exists!

    stdout, stderr, res = Open3.capture3(@node_binary, @program, :stdin_data => request.to_json)

    # Lets hope the process exited fine and had no errors
    if res.exitstatus == 0 and stderr.blank? then
      # Response must be a JSON object
      begin
        JSON.parse stdout
      rescue JSON::ParserError
        raise EsqulinoError::IdeService, "Bad JSON: \"#{stdout}\""
      end
    else
      # Nope, thats a defect
      raise EsqulinoError::IdeService, "Received stderr output: #{stderr}, stdout: #{stdout}, request: #{request.to_json}"
    end
  end
end

# Answers most requests with a string representation of the
# request. This is obviously only meant for testing.
class MockIdeService < BaseIdeService
  def execute_request(request)
    request.to_json
  end

  def emit_generated_blocks(block_language)
    if block_language and block_language.local_generator_instructions
      return ({
        "editor_blocks" => [],
        "editor_components" => [],
        "sidebars" => [],
        "root_css_classes" => []
      })
    else
      return nil
    end
  end

  # Mocking implementation can't fail
  def ping!
    true
  end

  # Mocking does not actually require an external program
  def cli_program_exists?
    true
  end
end

# Wraps access to "the one" ide service instance (and does a bit of magic
# because that instance may or may not be a mocked instance :/ Lets hope
# this leaky mock abstraction does not interfere with more ...)
#
# If you want to mock ("haha") me: I am very aware that this is essentially
# a singleton that does not always provide the exact same instance.
module IdeService
  @@mock_instance = MockIdeService.new

  # The configuration that is currently in use
  def self.live_config
    Rails.configuration.sqlino.fetch(:ide_service, Hash.new)
  end

  # Retrieves an instance that may be mocked. Use this if the result
  # of an IDE-service operation is not relevant for a testcase.
  def self.instance
    # The @@ide_service_instance may never be a MockIdeService, so
    # we need to take special care to not assign it by accident
    if live_config[:mock]
      @@mock_instance
    else
      @@ide_service_instance ||= instantiate
    end
  end

  # Retrieves an instance that may not be mocked. Use this **only** if the
  # result of an IDE-service operation is relevant during a testcase.
  def self.guaranteed_instance
    @@ide_service_instance ||= instantiate(allow_mock: false)
  end

  # Creates the instance that is responsible for all requests to the ide service
  def self.instantiate(service_config: nil, allow_mock: true)
    service_config ||= live_config

    # Mocking currently takes precedence about every other option. This is by
    # design to "override" the default configuration when running tests, but
    # its quite an ugly hack.
    if allow_mock && service_config[:mock]
      return @@mock_instance
    # Exec mode?
    elsif exec_config = service_config[:exec] then
      # Which kind of exec mode?
      case exec_config_mode = exec_config[:mode]
      when "one_shot" then return OneShotExecIdeService.new(config: exec_config)
      else raise EsqulinoError::IdeService, "Unkown IDE exec mode \"#{exec_config_mode}\""
      end
    # No known mode
    else
      raise EsqulinoError::IdeService, "Unkown general IDE-service configuration"
    end
  end

  class LogSubscriber < ActiveSupport::LogSubscriber
    def initialize
      super
    end

    def request(event)
      head = color("  IDE Request (#{event.duration.round(1)}ms)", MAGENTA, true)
      payload = color(event.payload[:request].to_json, YELLOW, true)
      debug "#{head}  #{payload}"
    end
  end
end
