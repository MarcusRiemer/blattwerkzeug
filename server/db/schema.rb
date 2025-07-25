# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.0].define(version: 2025_07_25_101626) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "hstore"
  enable_extension "pgcrypto"
  enable_extension "plpgsql"

  create_table "block_languages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.jsonb "model"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "slug"
    t.text "default_programming_language_id"
    t.uuid "grammar_id"
    t.jsonb "sidebars", default: []
    t.jsonb "editor_blocks", default: []
    t.jsonb "editor_components", default: []
    t.jsonb "local_generator_instructions"
    t.string "root_css_classes", default: [], array: true
    t.uuid "generated_from_id"
    t.jsonb "level"
    t.index ["default_programming_language_id"], name: "index_block_languages_on_default_programming_language_id"
    t.index ["generated_from_id"], name: "index_block_languages_on_generated_from_id"
    t.index ["grammar_id"], name: "index_block_languages_on_grammar_id"
    t.index ["slug"], name: "index_block_languages_on_slug", unique: true
  end

  create_table "code_resource_references", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "origin_id", null: false
    t.uuid "target_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["origin_id", "target_id"], name: "code_resource_references_unique", unique: true
    t.index ["origin_id"], name: "index_code_resource_references_on_origin_id"
    t.index ["target_id"], name: "index_code_resource_references_on_target_id"
  end

  create_table "code_resources", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.jsonb "ast"
    t.uuid "project_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "block_language_id", null: false
    t.text "programming_language_id", null: false
    t.string "compiled"
    t.string "assignment"
    t.index ["block_language_id"], name: "index_code_resources_on_block_language_id"
    t.index ["programming_language_id"], name: "index_code_resources_on_programming_language_id"
    t.index ["project_id"], name: "index_code_resources_on_project_id"
  end

  create_table "grammar_references", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "origin_id", null: false
    t.uuid "target_id", null: false
    t.integer "reference_type", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["origin_id", "target_id"], name: "grammar_references_unique", unique: true
    t.index ["origin_id"], name: "index_grammar_references_on_origin_id"
    t.index ["target_id"], name: "index_grammar_references_on_target_id"
  end

  create_table "grammars", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "slug"
    t.jsonb "model"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "programming_language_id"
    t.uuid "generated_from_id"
    t.jsonb "types", default: {}
    t.jsonb "foreign_types", default: {}
    t.jsonb "root"
    t.uuid "extends_id"
    t.jsonb "visualisations", default: {}
    t.jsonb "foreign_visualisations", default: {}
    t.index ["extends_id"], name: "index_grammars_on_extends_id"
    t.index ["generated_from_id"], name: "index_grammars_on_generated_from_id"
    t.index ["programming_language_id"], name: "index_grammars_on_programming_language_id"
    t.index ["slug"], name: "index_grammars_on_slug", unique: true
  end

  create_table "identities", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "uid"
    t.string "provider"
    t.jsonb "provider_data"
    t.jsonb "own_data"
    t.string "type"
    t.uuid "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_identities_on_user_id"
  end

  create_table "log_entries", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "event_type"
    t.datetime "created_at", null: false
    t.uuid "user_id"
    t.jsonb "data"
    t.index ["user_id"], name: "index_log_entries_on_user_id"
  end

  create_table "news", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.hstore "title"
    t.hstore "text"
    t.datetime "published_from"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id"
    t.index ["user_id"], name: "index_news_on_user_id"
  end

  create_table "programming_languages", id: :text, force: :cascade do |t|
    t.string "name", null: false
  end

  create_table "project_databases", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name"
    t.uuid "project_id"
    t.jsonb "schema"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_project_databases_on_project_id"
  end

  create_table "project_members", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "joined_at"
    t.uuid "user_id", null: false
    t.uuid "project_id", null: false
    t.integer "membership_type", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_project_members_on_project_id"
    t.index ["user_id"], name: "index_project_members_on_user_id"
  end

  create_table "project_sources", force: :cascade do |t|
    t.uuid "project_id", null: false
    t.string "url"
    t.string "title"
    t.text "display"
    t.boolean "read_only", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_project_sources_on_project_id"
  end

  create_table "project_uses_block_languages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "block_language_id"
    t.uuid "project_id"
    t.index ["block_language_id"], name: "index_project_uses_block_languages_on_block_language_id"
    t.index ["project_id", "block_language_id"], name: "block_languages_projects_unique", unique: true
    t.index ["project_id"], name: "index_project_uses_block_languages_on_project_id"
  end

  create_table "projects", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name_single"
    t.text "description_single"
    t.boolean "public", default: false, null: false
    t.uuid "preview"
    t.uuid "index_page_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "slug"
    t.uuid "default_database_id"
    t.uuid "user_id"
    t.hstore "name", default: {}, null: false
    t.hstore "description", default: {}, null: false
    t.index ["default_database_id"], name: "index_projects_on_default_database_id"
    t.index ["slug"], name: "index_projects_on_slug", unique: true
    t.index ["user_id"], name: "index_projects_on_user_id"
  end

  create_table "roles", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_roles_on_name"
  end

  create_table "user_roles", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id"
    t.uuid "role_id"
    t.index ["user_id", "role_id"], name: "index_user_roles_on_user_id_and_role_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "display_name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "email"
  end

  add_foreign_key "block_languages", "code_resources", column: "generated_from_id"
  add_foreign_key "block_languages", "grammars"
  add_foreign_key "block_languages", "programming_languages", column: "default_programming_language_id"
  add_foreign_key "code_resource_references", "code_resources", column: "origin_id"
  add_foreign_key "code_resource_references", "code_resources", column: "target_id"
  add_foreign_key "code_resources", "block_languages"
  add_foreign_key "code_resources", "programming_languages"
  add_foreign_key "code_resources", "projects"
  add_foreign_key "grammar_references", "grammars", column: "origin_id"
  add_foreign_key "grammar_references", "grammars", column: "target_id"
  add_foreign_key "grammars", "code_resources", column: "generated_from_id"
  add_foreign_key "grammars", "grammars", column: "extends_id"
  add_foreign_key "grammars", "programming_languages"
  add_foreign_key "identities", "users"
  add_foreign_key "log_entries", "users"
  add_foreign_key "news", "users"
  add_foreign_key "project_databases", "projects"
  add_foreign_key "project_members", "projects"
  add_foreign_key "project_members", "users"
  add_foreign_key "project_sources", "projects"
  add_foreign_key "project_uses_block_languages", "block_languages"
  add_foreign_key "project_uses_block_languages", "projects"
  add_foreign_key "projects", "project_databases", column: "default_database_id"
  add_foreign_key "projects", "users"
  add_foreign_key "user_roles", "roles"
  add_foreign_key "user_roles", "users"
end
