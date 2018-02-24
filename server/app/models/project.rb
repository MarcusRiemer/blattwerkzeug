# A project is a group of resources that logically belong together.
# Currently every project is assumed to be somewhat web-centric
# (using databases and HTML), but this is not set in stone.
class Project < ApplicationRecord
  # Source citations for projects
  has_many :project_sources, :dependent => :destroy
  # The actual code that is part of this project
  has_many :code_resources

  # The block languages this project explicitly allows
  has_many :project_uses_block_languages, :dependent => :destroy
  accepts_nested_attributes_for :project_uses_block_languages, allow_destroy: true

  # The actual allowed languages
  has_many :block_languages, :through => :project_uses_block_languages

  # All databases that are available for a project
  has_many :project_databases
  # The current default database for a project (if any). The Rails naming-scheme
  # requires us to use "belongs_to" here as that is the side that declares the
  # foreign_key. A "has_one" would be the logically sounding thing, but sadly
  # we can't use that here: If a column like "default_database_for" would exist
  # on the database model it would require a "unique" constraint and complicated
  # updating logic.
  belongs_to :default_database, :class_name => "ProjectDatabase", optional: true

  # Slugs must be unique across the whole database
  validates :slug, uniqueness: true

  # Name may not be empty
  validates :name, presence: true
  # Slug may not be empty
  validates :slug, presence: true

  # Projects that are publicly available
  scope :only_public, -> { where(public: true) }
  # A project with all associated resources that are required for
  # immediate display on the client.
  scope :full, -> {
    includes(:block_languages, :code_resources, :default_database, :project_databases, :project_sources)
  }
  # A project with all associated resources that are used by **only** this
  # project and no other project.
  scope :with_exclusive, -> {
    includes(:code_resources, :default_database, :project_databases, :project_sources, :project_uses_block_languages)
  }

  # Create the required folders in the projects data storage folder
  after_create do
    Rails.logger.info "Creating project data directory at #{data_directory_path}"
    raise EsqulinoError.new("Project directory already exist: #{data_directory_path}") if File.exist? data_directory_path
    Dir.mkdir data_directory_path
    Dir.mkdir File.join(data_directory_path, "databases")
    Dir.mkdir File.join(data_directory_path, "images")
  end

  # Remove the data folder
  after_destroy do
    FileUtils.rm_rf data_directory_path if File.directory? data_directory_path
  end

  # Retrieves the database with the given ID or the default database if no specific
  # ID to search for is given. This can't be used to access any database, only
  # databases that are part of this project are considered.
  #
  # @param database_id [UUID|string] The database to access
  # @param return [ProjectDatabase]
  #   A database with the matching ID (if its part of this project) or nil.
  def database_by_id_or_default(database_id = nil)
    if database_id then
      # Possibly omit to load all related databases if we are asked for
      # "the one" database anyway.
      if default_database.id == database_id then
        default_database
      else
        # Using `find` here (instead of `find_by`) should make sure that no query is
        # fired if this relation has been loaded already.
        project_databases.find {|db| db.id == database_id }
      end
    else
      default_database
    end
  end

  # Packs the project and all of its dependencies into a big blob of data. This blob
  # is meant to be fully self contained as we expect projects to be fairly small in the
  # average case. We may need to rethink this approach if individual projects turn out
  # to be too big.
  def to_full_api_response
    to_return = to_json_api_response

    to_return['schema'] = []
    to_return['apiVersion'] = '4'
    to_return['activeDatabase'] = "default"
    to_return['codeResources'] = self.code_resources.map(&:to_full_api_response)
    to_return['sources'] = self.project_sources.map(&:serializable_hash)
    to_return['blockLanguages'] = self.block_languages.map(&:to_full_api_response)
    to_return['projectUsesBlockLanguages'] = self.project_uses_block_languages.map(&:to_api_response)

    if default_database then
      to_return['schema'] = default_database.schema
    end

    to_return
  end

  # Hands out just enough data about this project to allow a nice listing of available
  # projects in the client.
  def to_list_api_response
    to_json_api_response
  end

  # TODO: This is a legacy holdover
  def write_access
    true
  end

  # The folder that should contain all assets that are part of this directory.
  def data_directory_path
    File.join(Rails.application.config.sqlino[:projects_dir], id)
  end

  # Returns a nicely readable representation of id, slug and name
  def readable_identification
    "\"#{name}\" (#{slug}, #{id})"
  end
end
