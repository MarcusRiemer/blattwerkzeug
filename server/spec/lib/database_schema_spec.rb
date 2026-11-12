require 'rails_helper'
require 'sqlite3'
require 'tempfile'

RSpec.describe "Database Schema" do
  SCHEMA_SEQUENCE_DB = <<~EOS
    BEGIN TRANSACTION;
      CREATE TABLE `key_value` (
      	`key`	INTEGER NOT NULL,
      	`value`	TEXT NOT NULL,
      	PRIMARY KEY(`key`)
      );
      CREATE TABLE `english_numbers` (
      	`number`	INTEGER,
      	`name`	TEXT,
      	PRIMARY KEY(`number`),
      	FOREIGN KEY(`number`) REFERENCES `key_value`(`key`)
      );
    COMMIT;
  EOS

  describe "sqlite3" do
    it 'sequence_db' do
      db = SchemaTools::sqlite_open_augmented(':memory:')
      db.execute_batch(SCHEMA_SEQUENCE_DB)

      schema = SchemaTools::database_describe_schema(db)

      expect(schema.size).to eq 2
      expect(schema[0].name).to eq "english_numbers"
      expect(schema[0].columns[0].index).to eq 0
      expect(schema[0].columns[0].name).to eq "number"
      expect(schema[0].columns[0].type).to eq "INTEGER"
      expect(schema[0].columns[0].not_null).to eq false
      expect(schema[0].columns[0].dflt_value).to be_nil
      expect(schema[0].columns[0].primary).to be true
      expect(schema[0].columns[1].index).to eq 1
      expect(schema[0].columns[1].name).to eq "name"
      expect(schema[0].columns[1].type).to eq "TEXT"
      expect(schema[0].columns[1].not_null).to eq false
      expect(schema[0].columns[1].dflt_value).to be_nil
      expect(schema[0].columns[1].primary).to be false

      expect(schema[0].foreign_keys[0].references[0].from_column).to eq "number"
      expect(schema[0].foreign_keys[0].references[0].to_table).to eq "key_value"
      expect(schema[0].foreign_keys[0].references[0].to_column).to eq "key"

      expect(schema[1].name).to eq "key_value"
      expect(schema[1].columns[0].index).to eq 0
      expect(schema[1].columns[0].name).to eq "key"
      expect(schema[1].columns[0].type).to eq "INTEGER"
      expect(schema[1].columns[0].not_null).to eq true
      expect(schema[1].columns[0].dflt_value).to be_nil
      expect(schema[1].columns[0].primary).to be true
      expect(schema[1].columns[1].index).to eq 1
      expect(schema[1].columns[1].name).to eq "value"
      expect(schema[1].columns[1].type).to eq "TEXT"
      expect(schema[1].columns[1].not_null).to eq true
      expect(schema[1].columns[1].dflt_value).to be_nil
      expect(schema[1].columns[1].primary).to be false
    end
  end
end
