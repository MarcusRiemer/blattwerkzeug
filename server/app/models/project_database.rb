require "fileutils"

# This is a database that is part of a certain project. In the current state
# of affairs we only support SQLite for these databases, but this might change
# sometime in the future.
class ProjectDatabase < ApplicationRecord
  belongs_to :project

  # The maximum number of rows a user facing query may return
  def user_result_max_rows
    100
  end

  # The maximum number of rows that are tested before giving
  # up on reporting a total count
  def count_result_max_rows
    5000
  end

  # Creating the database record for this instance is the trivial part.
  # The actual work is to create some sort of database-thing in the
  # "real world".
  #
  # This needs to happen after the creation in the database because we
  # need the id that was assigned.
  after_create do
    Rails.logger.info "Creating a SQLite database at #{sqlite_file_path}"
    FileUtils.mkdir_p project.databases_directory_path
    FileUtils.touch sqlite_file_path
  end

  # The backing "database thing" needs to be destroyed along with this
  # record.
  before_destroy do
    Rails.logger.info "Deleting a SQLite database at #{sqlite_file_path}"
    File.delete(sqlite_file_path) if File.exist?(sqlite_file_path)
  end

  # Retrieves the path to the SQLite file for this database
  def sqlite_file_path
    File.join(project.databases_directory_path, "#{id}.sqlite")
  end

  # Determines whether the given name of the table is part the schema of this
  # database.
  #
  # @param table_name [string] The name of the table in question
  # @return [Boolean] True if the given table_name is part of the database_schema
  def table_exists?(table_name)
    not table_schema(table_name).nil?
  end

  # Retrieves the schema for a specific table
  def table_schema(table_name)
    schema.find { |table| table["name"] == table_name } unless schema.nil?
  end

  # Creates a new table in the schema of this database
  #
  # @param table_description
  #   The table with all its properties, see the 'TableDescription' schema
  def table_create(table_description)
    if table_exists? table_description["name"]
      raise CreateDuplicateTableNameDatabaseError.new(self, table_description["name"])
    else
      create_statement = SchemaTools::Alter::table_to_create_statement(table_description)
      db_connection_admin.execute(create_statement)
      refresh_schema
    end
  end

  # Alters the database according to the given commands
  def table_alter(table_name, alter_commands_description)
    schema = table_schema(table_name)
    if schema
      # Do the actual altering and store the new schema
      SchemaTools::Alter::database_alter_schema(self, table_name, alter_commands_description)
      refresh_schema
    else
      raise EsqulinoError::UnknownDatabaseTable.new(self, table_name)
    end
  end

  # Deletes a table from the schema of this database
  #
  # @param table_description
  #   The table with all its properties, see the 'TableDescription' schema
  def table_delete(table_name)
    if table_exists? table_name
      db_connection_admin.execute("DROP TABLE #{table_name}")
      refresh_schema
    else
      raise EsqulinoError::UnknownDatabaseTable.new(self, table_name)
    end
  end

  # Retrieves paginated data of a certain table
  #
  # @param table_name [string] The name of the table.
  # @param from [Integer] The first row to fetch.
  # @param amount [Integer] The number of rows to fetch.
  # @return [Array<Array<String>>]] An array of strings for each row
  def table_row_data(table_name, from, amount)
    if table_exists? table_name
      result = execute_sql("SELECT * FROM #{table_name} LIMIT ? OFFSET ?", [amount.to_i, from.to_i], true)
      result["rows"]
    else
      raise EsqulinoError::UnknownDatabaseTable.new(self, table_name)
    end
  end

  # Retrieves the number of rows of a certain table
  #
  # @param table_name [string] The name of the table.
  # @return [Integer] The number of rows
  def table_row_count(table_name)
    if table_exists? table_name
      result = execute_sql("SELECT COUNT(*) FROM #{table_name}", [], true)
      result["rows"].first.first.to_i
    else
      raise EsqulinoError::UnknownDatabaseTable.new(self, table_name)
    end
  end

  # Inserts tabular data into a table.
  #
  # @param table_name [string] The name of the table.
  # @param column_names [Array<string>] The name of the columns
  def table_bulk_insert(table_name, column_names, rows)
    if table_exists? table_name
      sql_column_names = column_names
                         .map { |n| "'#{n}'" }
                         .join(",")
      sql_data = rows
                 .map { |r| "(" + r.map { |n| "'#{n}'" }.join(",") + ")" }
                 .join(",\n")

      sql = "INSERT INTO '#{table_name}' (#{sql_column_names}) VALUES\n#{sql_data}"

      execute_sql(sql, [], false)
    else
      raise EsqulinoError::UnknownDatabaseTable.new(self, table_name)
    end
  end

  # Refreshes the cached schema.
  def refresh_schema
    # Not so nice: Explicitly calling this complicated version of serializable_hash here
    # Not so nice: Converting keys
    self.schema = SchemaTools::database_describe_schema(db_connection_admin).map do |t|
      t
        .serializable_hash(include: {
                             columns: {},
                             foreign_keys: {
                               include: { references: {} }
                             },
                             system_table: {}
                           })
        .deep_transform_keys { |key| key.camelize(:lower) }
    end
  end

  # Refreshes and persists a possibly changed schema.
  def refresh_schema!
    refresh_schema
    save!
  end

  # Executes a arbitrary SQL query in the context of this project. This is of course
  # a major security concern and shouldn't be done lightly.
  #
  # @param sql [string] The SQL query
  # @param params [Hash] Query parameters
  # @param read_only [boolean] Execute in read only mode?
  # @param user_row_limit [integer] Maximum number of returned rows
  #
  # @return [Hash] { columns :: List, rows :: List of List }
  def execute_sql(sql, params,
                  read_only = false,
                  user_row_limit = user_result_max_rows,
                  count_row_limit = count_result_max_rows)
    # The SQLite driver returns the names of the columns in the first row. But we want
    # those to go in a hash with explicit names.
    execute_sql_raw(read_only) do |db|
      begin
        result = []
        num_rows = 0
        unknown_total = false
        db.execute2(sql, params) do |row|
          # Possibly remember the row
          if num_rows <= user_row_limit
            result << row
          end

          num_rows += 1

          # Break out of reading further SQL statements once we are over the hard limit
          if (num_rows > count_row_limit) then
            unknown_total = true
            break
          end
        end
        return {
          "columns" => result.first,
          "rows" => result.drop(1),
          "totalCount" => num_rows - 1, # First row are columns
          "changes" => db.changes,
          "unknownTotal" => unknown_total
        }
      rescue SQLite3::ConstraintException, SQLite3::SQLException => e
        # Something anticipated went wrong. This is probably the fault
        # of the caller in some way.
        raise EsqulinoError::DatabaseQuery.new(self, sql, params, e, false)
      rescue SQLite3::Exception => e
        # Something unanticipated went wrong. We assume this is an error in our
        # implementation (either server or client).
        raise EsqulinoError::DatabaseQuery.new(self, sql, params, e, true)
      end
    end
  end

  # This method is hopefully unnecessary
  def flush!
    if not @db_connection.nil?
      @db_connection.close
      @db_connection = nil
    end

    if not @db_connection_readonly.nil?
      @db_connection_readonly.close
      @db_connection_readonly = nil
    end

    if not @db_connection_admin.nil?
      @db_connection_admin.close
      @db_connection_admin = nil
    end
  end

  # Something went wrong when altering a database schema.
  class AlterProjectDatabaseError < EsqulinoError::Base
    # @param project_database [ProjectDatabase]
    #   The database the error occured in
    def initialize(project_database, data, code = 400)
      super "Could not alter database \"#{project_database.id}\" of project \"#{project_database.project_id}\"", code
      @data = data
    end
  end

  # Attempted to create a table with a name that already exists.
  class CreateDuplicateTableNameDatabaseError < AlterProjectDatabaseError
    def initialize(project_database, table_name)
      super(project_database, { "tableName" => table_name })
    end
  end

  protected

  # Allows to access the underlying database connection.
  #
  # @param read_only [Boolean]
  #   May be set to true if the returned collection shouldn't allow changes.
  #
  # @return
  #   The database connection instance that should be used for all communication
  #   with the database-instance behind this model.
  def db_connection(readonly = true)
    if readonly
      db_connection_readonly
    else
      # sqlite_open_augmented opens writable connections with synchronous=FULL
      # so that the readonly connection can see any changes immediately.
      @db_connection ||= SchemaTools::sqlite_open_augmented(sqlite_file_path)
    end
  end

  # @return
  #   A database connection that does not allow any changes to the underlying data or structure.
  def db_connection_readonly
    @db_connection_readonly ||= SchemaTools::sqlite_open_augmented(sqlite_file_path, readonly: true)
  end

  # @return
  #   A database connection that allow any changes to the underlying data or structure.
  def db_connection_admin
    @db_connection_admin ||= db_connection(false)
  end

  private

  # Prepares a properly constructed database object.
  def execute_sql_raw(readonly = true)
    db = db_connection(readonly)
    db.execute("PRAGMA foreign_keys = ON")
    # This is deprecated, but for our use case it is mightily handy to get back
    # fully qualified columnnames from SQLite
    # https://www.sqlite.org/pragma.html#pragma_full_column_names
    db.execute("PRAGMA short_column_names = OFF")
    db.execute("PRAGMA full_column_names = ON")
    yield db
    db.execute("PRAGMA foreign_keys = OFF")
  end
end
