require 'sqlite3'

module SchemaTools
  # sqlite3_set_authorizer action codes. The sqlite3 gem does not expose them.
  # Return only ALLOW or DENY. nil is SQLITE_IGNORE and turns a denied read into NULL.
  # See https://www.sqlite.org/c3ref/c_alter_table.html
  ALLOW = 0
  DENY = 1
  ATTACH = 24
  DETACH = 25
  PRAGMA = 19
  FUNCTION = 31
  READ = 20
  INSERT = 18
  UPDATE = 23
  DELETE = 9

  # Pragmas the server itself issues after the connection is locked.
  # Assignments to trusted_schema, query_only, temp_store, writable_schema,
  # and journal_mode are denied once the authorizer is installed.
  ALLOWED_PRAGMAS = %w[
    foreign_keys
    foreign_key_list
    foreign_key_check
    table_info
    short_column_names
    full_column_names
  ].freeze

  DENIED_FUNCTIONS = %w[
    load_extension
    readfile
    writefile
    edit
    fts3_tokenizer
  ].freeze

  # Opens an SQLite3-connection that has access to an implementation
  # of the REGEXP-function.
  #
  # The connection can read and write the opened database file. It cannot
  # ATTACH another file, VACUUM INTO another path, or call functions that
  # read or write the surrounding filesystem.
  #
  # @param sqlite_file_path [string] The path to open
  # @param options [Hash]
  #   :readonly opens the file with SQLITE_OPEN_READONLY.
  #   :synchronous is ignored; writable connections use PRAGMA synchronous=FULL.
  # @return [SQLite3::Database]
  def self.sqlite_open_augmented(sqlite_file_path, options = {})
    options = options.dup
    readonly = options.delete(:readonly)
    options.delete(:synchronous)
    options[:readonly] = true if readonly

    db = SQLite3::Database.open(sqlite_file_path, options)

    # Define the regular expressions using ruby
    db.create_function('regexp', 2) do |func, pattern, expression|
      unless expression.nil?
        func.result = expression.to_s.match(
          Regexp.new(pattern.to_s, Regexp::IGNORECASE)
        ) ? 1 : 0
      else
        # Return true if the value is null, let the DB handle this
        func.result = 1
      end
    end

    # These must run before the authorizer, which then refuses to change them.
    db.execute("PRAGMA trusted_schema = OFF")
    db.execute("PRAGMA temp_store = MEMORY")
    if db.readonly?
      db.execute("PRAGMA query_only = ON")
    else
      db.execute("PRAGMA synchronous = FULL")
    end

    db.authorizer = lambda do |action, arg1, arg2, _db_name, _source|
      case action
      when ATTACH, DETACH
        DENY
      when FUNCTION
        DENIED_FUNCTIONS.include?(arg2.to_s.downcase) ? DENY : ALLOW
      when PRAGMA
        name = arg1.to_s.downcase
        if ALLOWED_PRAGMAS.include?(name)
          ALLOW
        elsif name == "trusted_schema" && arg2.nil?
          # Reading the lockdown setting back is allowed. Assignments are denied.
          ALLOW
        else
          DENY
        end
      when READ, INSERT, UPDATE, DELETE
        arg1.to_s.casecmp("sqlite_dbpage").zero? ? DENY : ALLOW
      else
        ALLOW
      end
    end

    return db
  end

  # Describes the schema of a whole database as a handy dictionary
  # of tables with their columns.
  #
  # @param sqlite_db [string|SQLite3::Database]
  #   Path to the database or an instance of it
  # @return [Hash] A hash of SchemaTable instances
  def self.database_describe_schema(sqlite_db)
    db = if sqlite_db.is_a? String then
           sqlite_open_augmented(sqlite_db, readonly: true)
         else
           sqlite_db
         end

    # Find out names of tables
    table_names = db.execute("SELECT name
                            FROM sqlite_master
                            WHERE type='table'
                            ORDER BY name;")

    tables = []

    # Fill in the column for each table
    table_names.each do |name|
      # Find out everything about the table itself
      name = name[0]
      table_schema = SchemaTable.new name
      db.execute("PRAGMA table_info(#{name})") do |ci|
        column_schema = SchemaColumn.new(ci[0], ci[1], ci[2], ci[3], ci[4], ci[5])
        table_schema.add_column(column_schema)
      end

      # Get all foreign keys in a list and append them to the table
      foreign_keys_table = db.execute("PRAGMA foreign_key_list(#{name})")

      # A foreign key may consist of multiple columns, so we group all
      # columns that belong to the same foreign key
      grouped_foreign_keys = foreign_keys_table.group_by { |fk| fk[0]}
      grouped_foreign_keys.each do |key, value|
        foreign_key_comp = SchemaForeignKey.new()
        # Add all columns that are part of this particular foreign key
        value.each do |fk|
          foreign_key_ref = SchemaForeignKeyRef.new(fk[3], fk[2], fk[4])
          foreign_key_comp.add_foreign_key(foreign_key_ref)
        end
        table_schema.add_foreign_keys(foreign_key_comp)
      end

      tables << table_schema
    end

    return tables
  end

  # Visualizes the table in form of a GraphViz description that
  # still requires rendering.
  def self.database_graphviz_schema(sqlite_file_path)
    schema = database_describe_schema(sqlite_file_path)

    # Add nodes for all tables
    tables = schema
             .select { |table| not table.system?}
             .map do |table|
      columns = table.columns.map do |c|
        c_type = (table.is_column_fk? c) ? "FK" : c.type
        c_name = c.name
        c_pk = ""

        if c.primary
          c_name = "<B>#{c_name}</B>"
          c_pk = '<IMG SRC="vendor/icons/key.png" SCALE="TRUE"/>'
        end

        "<TR><TD WIDTH=\"16\" HEIGHT=\"16\" FIXEDSIZE=\"TRUE\" PORT=\"#{c.name}_name\">#{c_pk}</TD><TD ALIGN=\"LEFT\">#{c_name}</TD><TD ALIGN=\"LEFT\" PORT=\"#{c.name}_type\">#{c_type}</TD></TR>"
      end
      columns = columns.join "\n"
      record_string = "<TABLE BORDER=\"1\" CELLBORDER=\"0\"><TR><TD COLSPAN=\"3\">#{table.name}</TD></TR><HR/>\n#{columns}</TABLE>"

      "#{table.name.downcase} [label=<#{record_string}> class=\"#{table.name}\"];"
    end

    tables = tables.join("\n")

    # Now that there are nodes for all tables we can start adding
    # the relationships
    refs = []
    schema.each do |table|
      table.foreign_keys.each do |fk|
        fk.references.each do |ref|
          to_port_suffix   = ref.to_table == table.name ? "name" : "name"
          from_port_suffix = ref.to_table == table.name ? "name" : "type"

          node_from = "#{table.name.downcase}:#{ref.from_column}_#{from_port_suffix}"
          node_to   = "#{ref.to_table.downcase}:#{ref.to_column}_#{to_port_suffix}"
          port_from = ref.to_table == table.name ? 'w' : 'e'
          port_to   = 'w'
          refs << "#{node_from}:#{port_from} -> #{node_to}:#{port_to} [concentrate=true class=\"#{table.name.downcase} #{ref.to_table.downcase}\"];"
        end
      end
    end

    refs = refs.join("\n")

    # TODO: Remove dirty hack to set the path!
    to_return = <<~delim
      digraph db {
        graph[rankdir=LR, nodesep=0, splines=polyline, imagepath="../client/src", overlap=false];
        edge[dir=both, arrowhead=dot, arrowtail=dot];
        node[shape=plaintext, fontname = "Monospace"];
        #{tables}
        #{refs}
      }
    delim

    to_return
  end
end
