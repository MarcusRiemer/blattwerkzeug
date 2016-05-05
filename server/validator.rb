require 'json'
require 'json-schema'

require './error.rb'

# Validates JSON requests and responses against pre-loaded
# JSON schemas.
class Validator
  def initialize(schema_dir)
    @schemas = { }

    Dir.glob(File.realdirpath(schema_dir) + "/*.json").each do |schema_file|
      schema_name = File.basename(schema_file, ".json")

      # Some files share the .json extension but are not a schema
      if ["Makefile", "package"].include? schema_name then
        next
      end
      
      schema_content = File.read(schema_file)

      puts "Loading #{schema_name} at #{schema_file}"
      schema = JSON.load(schema_content, :quirks_mode => true)

      @schemas[schema_name] = schema
    end
  end

  def ensure_request(schema_name, body_string)
    # Ensuring the schema exists
    schema = @schemas[schema_name]
    if (schema == nil) then
      raise ArgumentError, "Could not validate against unknown schema \"#{schema_name}\""
    end

    # Loading the actual body
    body = JSON.parse(body_string)
    
    # Making sure it fits against a schema
    result = JSON::Validator.fully_validate(schema, body,
                                            :strict => true,
                                            :errors_as_objects => true,
                                            :parse_data => false)

    if result.length > 0 then
      raise InvalidSchemaError.new(schema_name, result)
    else
      puts "Request is valid"
      return body
    end
  end
end
