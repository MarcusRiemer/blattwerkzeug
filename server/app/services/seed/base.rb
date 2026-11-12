module Seed
  class Base
    # Global indentation level for log output
    @@indent = 0

    # base seed class as a parent class designed as a service to store and load seed classes with all the supported methods
    # BASE_SEED_DIRECTORY is a autoloaded path defined in sqlino.yaml in the config
    BASE_SEED_DIRECTORY = Rails.configuration.sqlino.fetch(:seed).fetch(:data_dir)

    INFO_OUTPUT = Rails.configuration.sqlino.fetch(:seed).fetch(:output)

    attr_reader :seed_id, :dependencies

    # look-up method for the model we want to process for seeding
    # SEED_IDENTIFIER defines the class of the Model, e.g  SEED_IDENTIFIER = Project
    def seed_class
      self.class::SEED_IDENTIFIER
    end

    # @param seed_id UUID, is either an id or an object and dependencies param with default value empty array
    # @param dependencies {}, is an empty hash by default unless any seed class provides any dependecy hash
    # @param defer_referential_checks boolean, is false by default unleass any seed class provides other value
    # based on seed models foreign key constraints
    def initialize(
          seed_id,
          dependencies: {},
          defer_referential_checks: false
        )
      @seed_id = seed_id
      @dependencies = dependencies
      @defer_referential_checks = defer_referential_checks
    end

    # Logs the given message on the "info" logging channel. Any block that follow will have its "info" output
    # printed in an indented manner.
    #
    # @param msg [string] The
    def info(msg = nil)
      puts ("#{('  ' * @@indent)}[#{seed_class}] #{msg}") unless msg.nil? || !INFO_OUTPUT
      if block_given?
        @@indent += 1
        yield
        @@indent -= 1
      end
    end

    # returns seed as Object of the model if one is not provided
    # returns nil if seed_id is not an object_id or object
    def seed
      return nil if File.extname(seed_id.to_s).present?

      @seed_data ||= seed_id.is_a?(seed_class) ? seed_id : find_seed(seed_id)
    end

    # returns seed model object after loading
    def loaded_seed
      @loaded_seed_data ||= seed_class.find_by!(id: load_id)
    end

    # When loading a seed, it's usualy the case that the provided seed_id is a yaml file
    # returns the seed_id as load_seed_id extracted form the yaml file
    # otherwise return nil
    def load_seed_id
      return File.basename(seed_id, ".*") if File.extname(seed_id.to_s).present? && File.extname(seed_id.to_s) == ".yaml"
      return seed_id unless seed_id.is_a?(seed_class)

      nil
    end

    # load_id can be UUID(id) or slug
    # if load_seed_id is neither a UUID nor a slug `find_load_seed_id` simply returns the provided seed_id during construction
    def load_id
      if load_seed_id
        if BlattwerkzeugUtil::string_is_uuid? load_seed_id.to_s
          load_seed_id.to_s
        else
          find_load_seed_id(load_seed_id.to_s)
        end
      end
    end

    # if seed_id is an id or slug of the object, return the object
    # @param slug_or_id UUID or Slug provided as seed_id via initialization
    def find_seed(slug_or_id)
      # All models have an "id" column
      query = seed_class.where(id: slug_or_id)

      # Some models have a "slug" column
      if (seed_class.column_names.include? "slug")
        query = query.or(seed_class.where(slug: slug_or_id))
      end

      query.first!
    end

    # seed_direcotry is defined in combination with
    # BASE_SEED_DIRECTORY and SEED_DIRECTORY configured in the seed specific files
    def seed_directory
      File.join BASE_SEED_DIRECTORY, self.class::SEED_DIRECTORY
    end

    # this directory is used to store particular seed model related seeds under the that seed_id,
    # such as store image for ProjectSeed
    def seed_specific_directory
      File.join seed_directory, load_id || seed.id
    end

    # Abstract methods for seed specific cases
    def after_store_seed; end

    def after_load_seed; end

    def move_data_from_tmp_to_data_directory; end

    # Constructs a storing seed or loading seed file path
    def seed_file_path
      File.join seed_directory, "#{load_id || seed.id}.yaml"
    end

    # if there is any depedency of a particular Seed model, it creates a manifest file
    # following a naming convention ....-deps.yaml which contains the dependent seeds info
    def project_dependent_file(directory, deps_id)
      File.join directory, "#{deps_id}-deps.yaml"
    end

    # class method to call on seed instance on identifier
    # takes all the records from the Model(identifier) and start storing
    def self.store_all
      self::SEED_IDENTIFIER.all.each { |s| new(s.id).start_store }
    end

    # calls the store method with an empty set which is populated with seed_directory, seed.id, self.class
    # during the storing process
    def start_store
      store(Set.new)
    end

    # store is responsible to store the seed
    # checks the if one has been already processed, usually when there is a dependecy,
    # it's required to break circular dependecy in the recursion process
    # calls store_seed and the after_store_seed which is seed specific case if something else needed to be stored after seed is stored
    def store(processed)
      if not processed.include? [seed_directory, seed.id, self.class]
        info "Storing #{seed.readable_identification}" do
          store_seed
          after_store_seed
          processed << [seed_directory, seed.id, self.class]
          store_dependencies(processed)
        end
      end

      return processed
    end

    # calls the dependent model on parent using send and serialize it
    # recursively calls store method to handle all the dependencies
    # Also writes the "deps" file for this instance so that the seed
    # can be safely loaded later.
    def store_dependencies(processed)
      # Set of [folder, id, SeedInstance class]
      immediate_dependencies = Set.new

      dependencies.each do |seed_model_attribute, dependent_seed_class|
        # Query the model for the attribute that needs to be saved
        data = seed.send(seed_model_attribute)
        to_serialize = (data || [])

        # The attribute may or may not be a list-y kind of thing
        # We wrap single items in a list because it is easier to
        # work with a uniform interface.
        if not to_serialize.respond_to?(:each)
          to_serialize = [to_serialize]
        end

        # Turn the dependencies into seed class instances
        # and store them
        to_serialize.each do |dep_attr|
          s = dependent_seed_class.new(dep_attr)
          s.store(processed)
          immediate_dependencies.add([s.seed_directory, s.seed.id, s.class])
        end
      end

      # After all things have been stored: write the deps file
      if not immediate_dependencies.empty?
        File.open(project_dependent_file(seed_directory, seed.id), "w") do |file|
          YAML::dump(immediate_dependencies.to_a, file)
        end
      end
    end

    # dump data into a yaml file in the seed direcotry
    def store_seed
      FileUtils.mkdir_p seed_directory
      File.open(seed_file_path, "w") do |file|
        visitor = PrettyJsonTree.create
        visitor << seed
        visitor.tree.yaml(file)
      end
    end

    # Loads the data from the yaml to database
    # load dependecies of a particular project if there is any
    # `run_within_correct_transaction` disables the foreign_key constraints
    # if @defer_referential_checks is true then save it by just updating the timestamp to enable the referential integrity of the model
    # `move_data_from_tmp_to_data_directory` moves the assests from tmp to origial directory after loading process is done
    #
    # @param loaded [Set<String>] IDs that have been loaded already
    def start_load(loaded = Set.new)
      # Ensure we are not loading something multiple times
      if not loaded.include? seed_id
        loaded << seed_id # Treat this instance as loaded to avoid circular dependencies

        info "Loading #{seed_instance.readable_identification}" do
          # Dependencies must be loaded first
          dep = File.join seed_directory, "#{load_id}-deps.yaml"

          run_within_correct_transaction do
            upsert_seed_data

            load_dependencies(loaded) if File.exist? dep

            if @defer_referential_checks
              # TODO: Horrible hack to ensure that the record inserted was actually valid
              # Nicer: Defer the constraint checks instead of outright disabling them,
              #        but this does not seem to be possible from Rails.
              # See:  https://wiki.postgresql.org/wiki/Referential_Integrity_Tutorial_%26_Hacking_the_Referential_Integrity_tables#Deferring_transactions
              # See also: https://github.com/nullobject/rein
              db_instance = seed_class.find_or_initialize_by(id: load_id)
              db_instance.save!(touch: false)
            end

            move_data_from_tmp_to_data_directory
          end
        end
      end
    rescue ActiveRecord::RecordInvalid => e
      # Reading the stdout-dump is really tedious, so we drop to pry instead
      if Rails.env.development?
        binding.pry
      end

      # Re-raise the original exception
      raise
    end

    # load yaml dump as seed instaces ready to be loaded
    # raise in case no file is found with provided load_id
    def seed_instance
      raise "Could not find project with slug or ID \"#{load_id}\"" unless File.exist? seed_file_path

      yaml_safe_classes= ::Seed.constants
                           .select {|c| ::Seed.const_get(c).is_a? Class }
                           .map {|c| ::Seed.const_get(c) }

      YAML.unsafe_load_file(seed_file_path)
    end

    # raise if the seed_instance class does not match with the seed_class (model or Identifier) are not matched
    # instantiate a new record if there is none by the provided load_id or find the the existing one
    # save the instance if theere is a change
    # runs the `after_load_seed` hook when upsert is done
    def upsert_seed_data
      raise RuntimeError.new "Mismatched types, instance: #{seed_instance.class.name}, instance_type: #{seed_class.name}" if seed_instance.class != seed_class

      db_instance = seed_class.find_or_initialize_by(id: load_id)
      db_instance.assign_attributes(seed_instance.attributes)
      db_instance.save!(touch: false) if db_instance.changed?

      after_load_seed
    end

    # reads the dependency file and takes the seed_id and seed class
    # call the seed class with upsert_seed_data method to load the dependent data tables
    # @param loaded [Set<String>] IDs that have been loaded already
    def load_dependencies(loaded)
      deps = File.join seed_directory, "#{load_id}-deps.yaml"

      deps = YAML.unsafe_load_file(deps)
      deps
        .select do |_, seed_id| not loaded.include? seed_id end
        .each do |_, seed_id, seed| seed.new(seed_id).start_load(loaded) end
    end

    # class method to load files started outside of instance scope or from global scope
    # skips dependecy files(-deps.yaml) which is handled by load_dependencies
    # calls a new instance of the seed class with start_load for all the available loadable files
    def self.load_all
      Dir.glob(File.join load_directory, "*.yaml").each do |f|
        next if f =~ /deps/

        new(File.basename(f)).start_load
      end
    end

    # builds the load directroy used for loading all data under it outside the scope of class instance
    def self.load_directory
      File.join BASE_SEED_DIRECTORY, self::SEED_DIRECTORY
    end

    private

    # if `load_seed_id` is not an UUID then it tries to match the slug in yaml files
    # upon iterating through all the files in correspoinding seed directory it finds a match and returns
    # returns early before iteration process if seed_file_data YAML dump or seed does not contain any slug attribute
    def find_load_seed_id(load_seed_id)
      Dir.glob(File.join seed_directory, "*.yaml").each do |f|
        next if f =~ /deps/

        seed_file_data = YAML.unsafe_load_file(f)
        return load_seed_id unless seed_file_data.has_attribute?(:slug)
        if seed_file_data.slug == load_seed_id
          return seed_file_data.id
        end
      end

      raise "Could not find item with ID \"#{load_seed_id}\" in serialized seed data"
    end

    # Takes a block and yield `disable_referential_integrity` if `defer_referential_checks` is true
    # otherwise just yields the block. This allows certain seed configurations to temporarily disable
    # consistency checks (which is sometimes required for circular dependencies).
    def run_within_correct_transaction
      if @defer_referential_checks
        ActiveRecord::Base.connection.disable_referential_integrity do
          yield
        end
      else
        yield
      end
    end
  end

  # Psych dumps ActiveModel::Attribute through encode_with, which writes the
  # compact JSON string Postgres returned. This visitor pretty-prints that
  # string so the seed file gets a literal block.
  class PrettyJsonTree < Psych::Visitors::YAMLTree
    def accept(target)
      return super unless target.is_a?(ActiveModel::Attribute)

      @coders << target
      coder = Psych::Coder.new(attribute_tag(target))
      target.encode_with(coder)
      pretty_print_json(coder)
      emit_coder(coder, target)
    end

    private

    def attribute_tag(target)
      Psych.dump_tags[target.class] || "!ruby/object:#{target.class.name}"
    end

    def pretty_print_json(coder)
      raw = coder["value_before_type_cast"]
      return unless raw.is_a?(String)

      parsed = JSON.parse(raw)
      return unless parsed.is_a?(Hash) || parsed.is_a?(Array)
      return if parsed.empty?

      coder["value_before_type_cast"] = JSON.pretty_generate(parsed)
    rescue JSON::ParserError
      nil
    end
  end
end
