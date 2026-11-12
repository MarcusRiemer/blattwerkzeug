require 'rails_helper'

RSpec.describe ProjectDatabase, type: :model do
  # A database with a single table
  def database_description_key_value
    [
      {
        "name" => "key_value",
        "columns" => [
          {
            "name" => "key",
            "type" => "INTEGER",
            "index" => 0,
            "primary" => true,
            "notNull" => true,
            "dfltValue" => nil
          },
          {
            "name" => "value",
            "type" => "TEXT",
            "index" => 1,
            "primary" => false,
            "notNull" => false,
            "dfltValue" => "value"
          }
        ],
        "foreignKeys" => [],
        "systemTable" => false
      }
    ]
  end

  # A database with loads of types and and two tables
  def database_description_two_tables
    [
      {
        "name" => "a",
        "columns" => [
          {
            "name" => "a_id",
            "type" => "INTEGER",
            "index" => 0,
            "primary" => true,
            "notNull" => true,
            "dfltValue" => nil
          },
          {
            "name" => "a_b",
            "type" => "TEXT",
            "index" => 1,
            "primary" => false,
            "notNull" => false,
            "dfltValue" => nil
          },
          {
            "name" => "a_c",
            "type" => "BOOLEAN",
            "index" => 1,
            "primary" => false,
            "notNull" => false,
            "dfltValue" => nil
          },
          {
            "name" => "a_d",
            "type" => "FLOAT",
            "index" => 1,
            "primary" => false,
            "notNull" => false,
            "dfltValue" => nil
          },
          {
            "name" => "a_e",
            "type" => "URL",
            "index" => 1,
            "primary" => false,
            "notNull" => false,
            "dfltValue" => nil
          },
        ],
        "foreignKeys" => [
          {
            "references" =>
            [
              {
                "toTable" => "b",
                "toColumn" => "b_id",
                "fromColumn" => "a_b"
              }
            ]
          }
        ]
      },
      {
        "name" => "b",
        "columns" => [
          {
            "name" => "b_id",
            "type" => "TEXT",
            "index" => 1,
            "primary" => false,
            "notNull" => false,
            "dfltValue" => nil
          },
        ],
        "foreignKeys" => []
      }
    ]
  end

  describe 'empty database' do
    after(:each) do
      if @db.project && @db.project.default_database_id == @db.id then
        @db.project.update!(default_database: nil)
      end
      @db.destroy!
      @db.project.destroy! if @db.project
    end

    it 'has the correct sqlite_file_path' do
      @db = FactoryBot.create(:project_database)

      expect(@db.sqlite_file_path).to include @db.project_id
      expect(@db.sqlite_file_path).to include @db.id
    end

    it 'table_exists?' do
      @db = FactoryBot.build(:in_memory_project_database)

      expect(@db.table_exists? "").to be false
      expect(@db.table_exists? "foo").to be false
    end

    it 'refresh_schema' do
      @db = FactoryBot.build(:in_memory_project_database)

      @db.refresh_schema
      expect(@db.schema).to eq []
    end

    it 'creating and analyzing a single table' do
      @db = FactoryBot.create(:project_database)
      @db.table_create(database_description_key_value[0])

      # Schema must have been updated
      expect(@db.schema.size).to eq 1
      expect(@db.schema[0]).to eq database_description_key_value[0]

      # Table "key_value" must exist
      expect(@db.table_exists? "key_value").to be true
      expect(@db.table_exists? "value_key").to be false
      expect(@db.table_schema "key_value").not_to be_nil
      expect(@db.table_schema "value_key").to be_nil

      # Table must be empty
      expect(@db.table_row_data(database_description_key_value[0]['name'], 0, 1)).to eq []
      expect(@db.table_row_count(database_description_key_value[0]['name'])).to eq 0
    end

    it 'deleting a nonexistant table' do
      @db = FactoryBot.build(:in_memory_project_database)

      expect { @db.table_delete('nonexistant') }.to raise_exception(EsqulinoError::UnknownDatabaseTable)
    end

    it 'creating a duplicate table' do
      @db = FactoryBot.build(:tempfile_project_database)
      @db.table_create(database_description_key_value[0])
      expect { @db.table_create(database_description_key_value[0]) }.to raise_exception(ProjectDatabase::CreateDuplicateTableNameDatabaseError)
    end

    it 'creating and deleting a single table' do
      @db = FactoryBot.build(:tempfile_project_database)
      @db.table_create(database_description_key_value[0])

      # Schema must have been updated
      expect(@db.schema.size).to eq 1

      @db.table_delete(database_description_key_value[0]['name'])
    end
  end

  context 'key_value: alter single table' do
    before(:each) do
      @db = FactoryBot.create(:project_database)
      @db.table_create(database_description_key_value[0])
    end

    after(:each) do
      if @db.project && @db.project.default_database_id == @db.id then
        @db.project.update!(default_database: nil)
      end
      @db.destroy!
      @db.project.destroy! if @db.project
    end

    it 'add column' do
      new_schema = @db.table_alter "key_value", [{ "index" => 0, "type" => "addColumn" }]
      expect(new_schema[0]['columns'].size).to eq 3
    end

    it 'add column and rename it' do
      new_schema = @db.table_alter("key_value", [
                                     { "index" => 0, "type" => "addColumn" },
                                     {
                                       "columnIndex" => 2,
                                       "index" => 1,
                                       "newName" => "Renamed_Column",
                                       "oldName" => "New_Column",
                                       "type" => "renameColumn"
                                     }
                                   ])

      expect(new_schema[0]['columns'].size).to eq 3
      expect(new_schema[0]['columns'][2]['name']).to eq "Renamed_Column"
    end

    it 'delete column' do
      new_schema = @db.table_alter("key_value", [
                                     {
                                       "index" => 0,
                                       "columnIndex" => 1,
                                       "type" => "deleteColumn"
                                     },
                                   ])

      expect(new_schema[0]['columns'].size).to eq 1
    end

    it 'swap column order' do
      new_schema = @db.table_alter("key_value", [
                                     {
                                       "index" => 0,
                                       "columnIndex" => 0,
                                       "indexOrder" => [1, 0],
                                       "type" => "switchColumn"
                                     },
                                   ])

      expect(new_schema[0]['columns'].size).to eq 2
    end

    it 'toggle primary key' do
      # First flip
      new_schema = @db.table_alter "key_value",
                                   [{ "index" => 0, "columnIndex" => 0, "type" => "changeColumnPrimaryKey" }]
      expect(new_schema[0]['columns'][0]['primary']).to eq false

      # Second flip
      new_schema = @db.table_alter "key_value",
                                   [{ "index" => 0, "columnIndex" => 0, "type" => "changeColumnPrimaryKey" }]
      expect(new_schema[0]['columns'][0]['primary']).to eq true
    end

    it 'toggle NOT NULL' do
      # First flip
      new_schema = @db.table_alter "key_value",
                                   [{ "index" => 0, "columnIndex" => 1, "type" => "changeColumnNotNull" }]
      expect(new_schema[0]['columns'][1]['notNull']).to eq true

      # Second flip
      new_schema = @db.table_alter "key_value",
                                   [{ "index" => 0, "columnIndex" => 1, "type" => "changeColumnNotNull" }]
      expect(new_schema[0]['columns'][1]['notNull']).to eq false
    end

    it 'alter default value' do
      new_schema = @db.table_alter "key_value", [
        {
          "index" => 0,
          "columnIndex" => 1,
          "type" => "changeColumnStandardValue",
          "oldValue" => "dont care",
          "newValue" => "'new value'"
        }
      ]
      expect(new_schema[0]['columns'][1]['dfltValue']).to eq "'new value'"
    end

    it 'rename table' do
      new_schema = @db.table_alter "key_value", [
        {
          "index" => 0,
          "type" => "renameTable",
          "oldName" => "key_value",
          "newName" => "value_key"
        }
      ]
      expect(new_schema[0]['name']).to eq "value_key"
    end
  end

  context 'key_value: alter multiple tables' do
    before(:each) do
      @db = FactoryBot.create(:project_database)
      @db.table_create(database_description_two_tables[1])
      @db.table_create(database_description_two_tables[0])
    end

    after(:each) do
      if @db.project && @db.project.default_database_id == @db.id then
        @db.project.update!(default_database: nil)
      end
      @db.destroy!
      @db.project.destroy! if @db.project
    end

    it 'remove foreign keys' do
      new_schema = @db.table_alter "a", [
        {
          "index" => 0,
          "type" => "removeForeignKey",
          "foreignKeyToRemove" => {
            "references" => [
              {
                "to_table" => "b",
                "to_column" => "b_id",
                "from_column" => "a_b"
              }
            ]
          }
        }
      ]
      expect(new_schema[0]['name']).to eq "a"
      expect(new_schema[0]['foreignKeys']).to eq []
    end
  end

  context 'bulk insert' do
    before(:each) do
      @table_name = database_description_key_value[0]['name']
      @db = FactoryBot.create(:project_database)
      @db.table_create(database_description_key_value[0])
    end

    after(:each) do
      if @db.project && @db.project.default_database_id == @db.id then
        @db.project.update!(default_database: nil)
      end
      @db.destroy!
      @db.project.destroy! if @db.project
    end

    it 'single row' do
      res = @db.table_bulk_insert(
        @table_name,
        ['key', 'value'],
        [
          ['1', 'eins']
        ]
      )

      expect(res['changes']).to be 1
      expect(@db.table_row_count @table_name).to be 1
    end

    it 'two rows' do
      res = @db.table_bulk_insert(
        @table_name,
        ['key', 'value'],
        [
          ['1', 'eins'],
          ['2', 'zwei']
        ]
      )

      expect(res['changes']).to be 2
      expect(@db.table_row_count @table_name).to be 2
    end

    it 'twice' do
      res = @db.table_bulk_insert(
        @table_name,
        ['key', 'value'],
        [['1', 'eins']]
      )

      expect(res['changes']).to be 1
      expect(@db.table_row_count @table_name).to be 1

      res = @db.table_bulk_insert(
        @table_name,
        ['key', 'value'],
        [['2', 'zwei']]
      )

      expect(res['changes']).to be 1
      expect(@db.table_row_count @table_name).to be 2
    end

    it 'missing keys' do
      res = @db.table_bulk_insert(
        @table_name,
        ['value'],
        [
          ['eins'],
          ['zwei']
        ]
      )

      expect(res['changes']).to be 2
      expect(@db.table_row_count @table_name).to be 2
    end

    it 'unknown table' do
      expect do
        @db.table_bulk_insert(
          @table_name + '_nonexistant',
          ['key', 'value'],
          [
            ['1', 'eins'],
          ]
        )
      end.to raise_exception EsqulinoError::UnknownDatabaseTable
    end

    it 'more data columns then actual columns' do
      expect do
        @db.table_bulk_insert(
          @table_name,
          ['key', 'value'],
          [
            ['1', 'eins', 'error_too_much'],
          ]
        )
      end.to raise_exception EsqulinoError::DatabaseQuery
    end

    it 'less data columns then actual columns' do
      expect do
        @db.table_bulk_insert(
          @table_name,
          ['key', 'value'],
          [
            ['error_not_enough'],
          ]
        )
      end.to raise_exception EsqulinoError::DatabaseQuery
    end
  end

  describe 'execute_sql' do
    before(:each) do
      @db = FactoryBot.create(:project_database, :table_numbers, row_count: 700)
    end

    after(:each) do
      if @db.project && @db.project.default_database_id == @db.id then
        @db.project.update!(default_database: nil)
      end
      @db.destroy!
      @db.project.destroy! if @db.project
    end

    it 'Truncates too large result sets' do
      res = @db.execute_sql("SELECT * FROM numbers a, numbers b", Hash.new, true, 10, 100)

      expect(res['unknownTotal']).to be true
      expect(res['totalCount']).to eq 100
      expect(res['rows'].length).to eq 10
    end

    it 'Delivers entirely fitting result sets' do
      res = @db.execute_sql("SELECT * FROM numbers a, numbers b LIMIT 10", Hash.new, true, 10, 100)

      expect(res['unknownTotal']).to be false
      expect(res['totalCount']).to eq 10
      expect(res['rows'].length).to eq 10
    end

    it 'Delivers partially fitting result sets' do
      res = @db.execute_sql("SELECT * FROM numbers a, numbers b LIMIT 20", Hash.new, true, 10, 100)

      expect(res['unknownTotal']).to be false
      expect(res['totalCount']).to eq 20
      expect(res['rows'].length).to eq 10
    end

    describe 'connection lockdown' do
      def connection_handles
        [@db.send(:db_connection, false), @db.send(:db_connection, true)]
      end

      it 'opens a writable handle and a readonly handle' do
        write_db, read_db = connection_handles

        expect(write_db.readonly?).to be false
        expect(read_db.readonly?).to be true
      end

      it 'refuses ATTACH and VACUUM INTO on both handles' do
        destination = "#{@db.sqlite_file_path}-vacuum-probe"
        vacuum_sql = "VACUUM INTO '#{destination.gsub("'", "''")}'"

        connection_handles.each do |handle|
          expect { handle.execute("ATTACH DATABASE ':memory:' AS extra") }
            .to raise_exception(SQLite3::AuthorizationException)
          expect { handle.execute(vacuum_sql) }
            .to raise_exception(SQLite3::AuthorizationException)
        end

        expect(File.exist?(destination)).to be false
      end

      it 'keeps trusted_schema off and refuses to turn safety pragmas back on' do
        connection_handles.each do |handle|
          expect(handle.execute("PRAGMA trusted_schema")).to eq [[0]]
          expect { handle.execute("PRAGMA trusted_schema=ON") }
            .to raise_exception(SQLite3::AuthorizationException)
          expect { handle.execute("PRAGMA writable_schema=ON") }
            .to raise_exception(SQLite3::AuthorizationException)
        end
      end

      it 'refuses load_extension' do
        connection_handles.each do |handle|
          expect { handle.execute("SELECT load_extension('/does/not/exist')") }
            .to raise_exception(SQLite3::SQLException, /not authorized to use function: load_extension/)
        end
      end

      it 'writes the opened database and refuses those writes on the readonly handle' do
        write_db, read_db = connection_handles

        write_db.execute("INSERT INTO numbers (number) VALUES (9999)")
        write_db.execute("UPDATE numbers SET number = 9998 WHERE number = 9999")
        expect(write_db.execute("SELECT number FROM numbers WHERE number = 9998")).to eq [[9998]]
        expect(read_db.execute("SELECT number FROM numbers WHERE number = 9998")).to eq [[9998]]

        write_db.execute("DELETE FROM numbers WHERE number = 9998")
        expect(write_db.execute("SELECT COUNT(*) FROM numbers WHERE number = 9998")).to eq [[0]]

        expect { read_db.execute("INSERT INTO numbers (number) VALUES (9997)") }
          .to raise_exception(SQLite3::ReadOnlyException)
        expect { read_db.execute("UPDATE numbers SET number = 9996 WHERE number = 1") }
          .to raise_exception(SQLite3::ReadOnlyException)
        expect { read_db.execute("DELETE FROM numbers WHERE number = 1") }
          .to raise_exception(SQLite3::ReadOnlyException)
      end
    end
  end

  it 'properly generates foreign_key references' do
    db = create(:project_database, :tables_references)
    schema = db.refresh_schema

    expect(schema[0]["foreignKeys"][0]["references"][0]).to eq({
                                                                 "fromColumn" => "key",
                                                                 "toTable" => "B",
                                                                 "toColumn" => "key"
                                                               })
  end

  # This spec can't be run with FakeFS as the C-bindings of SQLite
  # don't know anything about the faking that goes on in the background.
  it 'creates database files' do
    project = FactoryBot.create(:project)

    expect(File.directory? project.data_directory_path).to be true
    expect(File.directory? File.join(project.data_directory_path, "databases")).to be true

    db = project.default_database = FactoryBot.build(:tempfile_project_database, project_id: project.id)

    db.save!
    expect(File.exist? db.sqlite_file_path).to be true

    db.destroy!
    project.destroy!
  end

  it "prints a readable identification" do
    res = FactoryBot.create(:project_database, name: "debbie")
    readable = res.readable_identification
    expect(readable).to include res.id
    expect(readable).to include res.name
  end
end
