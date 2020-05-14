require 'rails_helper'

RSpec.describe CodeResource, type: :model do
  context "name" do
    it "rejects a missing name" do
      res = FactoryBot.build(:code_resource, name: nil)

      res.validate
      expect(res.errors["name"].length).to be 1
    end

    it "rejects a blank name" do
      res = FactoryBot.build(:code_resource, name: " ")

      res.validate
      expect(res.errors["name"].length).to be 1
    end

    it "allows very short names" do
      res = FactoryBot.build(:code_resource, name: "a")

      res.validate
      expect(res.errors["name"].length).to be 0
    end
  end

  context "AST" do
    it "rejects nodes without a name" do
      res = FactoryBot.build(
        :code_resource,
        ast: {
          "language" => "specLang"
        }
      )

      res.validate
      expect(res.errors["ast"].length).to be 1
      expect(res.compiled).to be nil
    end

    it "rejects nodes without a language" do
      res = FactoryBot.build(
        :code_resource,
        ast: {
          "name" => "specRoot"
        }
      )

      res.validate
      expect(res.errors["ast"].length).to be 1
      expect(res.compiled).to be nil
    end

    it "accepts a missing root" do
      res = FactoryBot.build(:code_resource, ast: nil)
      res.validate
      expect(res.errors["ast"].length).to be 0
    end

    it "accepts a valid tree" do
      res = FactoryBot.create(
        :code_resource,
        ast: {
          "language" => "specLang",
          "name" => "specRoot"
        }
      )

      # Tree is valid, no errors expected
      expect(res.errors["ast"].length).to be 0

      # Compiled should be *something* after saving
      res.save!
      expect(res.compiled).not_to be_nil
      expect(res.to_full_api_response).to validate_against "CodeResourceDescription"
    end
  end

  context "to_full_api_response" do
    it "without AST" do
      api_response = FactoryBot.build(:code_resource, project: nil, ast: nil).to_full_api_response

      expect(api_response['name']).to be_a String
      expect(api_response['programmingLanguageId']).to be_a String
      expect(api_response['blockLanguageId']).to be_a String
    end

    it "with AST snake_case values" do
      ast = {
        "language" => "spec_lang",
        "name" => "spec_name"
      }
      api_response = FactoryBot.build(
        :code_resource,
        project: nil,
        ast: ast
      ).to_full_api_response

      # AST must not change
      expect(api_response['ast']).to eq ast
    end

    it "with AST snake_case keys" do
      ast = {
        "language" => "spec_lang",
        "name" => "spec_name",
        "children" => {
          "snake_case" => []
        }
      }

      api_response = FactoryBot.create(
        :code_resource,
        ast: ast
      ).to_full_api_response

      # AST must not change
      expect(api_response['ast']).to eq ast
      expect(api_response).to validate_against "CodeResourceDescription"
    end
  end

  context "by_programming_language" do
    it "No resources available at all" do
      expect(CodeResource.list_by_programming_language("css")).to eq []
    end

    it "A single sql resource" do
      res = FactoryBot.create(:code_resource, :sql_key_value_select_double)

      queried = CodeResource.list_by_programming_language("sql")
      expect(queried).to eq([res])
      expect(queried[0].attributes.keys).to eq(["id", "name"])
    end

    it "A single sql resource and a unrelated resource" do
      FactoryBot.create(:code_resource)
      res = FactoryBot.create(:code_resource, :sql_key_value_select_double)

      queried = CodeResource.list_by_programming_language("sql")
      expect(queried).to eq([res])
      expect(queried[0].attributes.keys).to eq(["id", "name"])
      expect(queried[0].to_json_api_response.keys).to eq(["id", "name"])
    end
  end

  context "Traits for builtin snippets" do
    it "SQL" do
      res = FactoryBot.build(:code_resource, :sql_key_value_select_double)
      expect(res.programming_language_id).to eq "sql"
    end

    it "Meta Grammar" do
      res = FactoryBot.build(:code_resource, :grammar_single_type)
      expect(res.programming_language_id).to eq "meta-grammar"
    end
  end

  context "immediate_dependants" do
    it "is empty if nothing depends on this" do
      res = FactoryBot.build(:code_resource, :grammar_single_type)
      expect(res.immediate_dependants.to_a).to eq []
    end

    it "with a single grammar" do
      res = FactoryBot.create(:code_resource, :grammar_single_type)
      grammar = FactoryBot.create(:grammar, generated_from: res)

      expect(res.immediate_dependants.to_a).to eq [grammar]
    end
  end

  context "regenerate_immediate_dependants!" do
    it "is empty if nothing depends on this" do
      unrelated = FactoryBot.create(:grammar)
      res = FactoryBot.create(:code_resource, :grammar_single_type)
      changed = res.regenerate_immediate_dependants!

      expect(changed).to eq []
    end

    it "with a single grammar that isn't used for a block language" do
      related = FactoryBot.create(:code_resource, :grammar_single_type)
      grammar = FactoryBot.create(:grammar, generated_from: related)

      changed = related.regenerate_immediate_dependants!(ide_service: IdeService.guaranteed_instance)
      expect(changed).to match_array [grammar]
    end

    it "with a single grammar that affects a block language" do
      related = FactoryBot.create(:code_resource, :grammar_single_type)
      grammar = FactoryBot.create(:grammar, generated_from: related)
      block_language = FactoryBot.create(:block_language, :auto_generated_blocks, grammar: grammar)

      changed = related.regenerate_immediate_dependants!(ide_service: IdeService.guaranteed_instance)
      expect(changed).to match_array [grammar, block_language]
    end

    it "with a single grammar that affects a block language that can't be regenerated" do
      related = FactoryBot.create(:code_resource, :grammar_single_type)
      grammar = FactoryBot.create(:grammar, generated_from: related)
      block_language = FactoryBot.create(:block_language, grammar: grammar)

      changed = related.regenerate_immediate_dependants!(ide_service: IdeService.guaranteed_instance)
      expect(changed).to match_array [grammar]
    end

    it "with a single grammar that affects two block languages (both not regeneratable)" do
      related = FactoryBot.create(:code_resource, :grammar_single_type)
      grammar = FactoryBot.create(:grammar, generated_from: related)
      b1 = FactoryBot.create(:block_language, grammar: grammar)
      b2 = FactoryBot.create(:block_language, grammar: grammar)

      changed = related.regenerate_immediate_dependants!(ide_service: IdeService.guaranteed_instance)
      expect(changed).to match_array [grammar]
    end

    it "with a single grammar that affects two block languages (both regeneratable)" do
      related = FactoryBot.create(:code_resource, :grammar_single_type)
      grammar = FactoryBot.create(:grammar, generated_from: related)
      b1 = FactoryBot.create(:block_language, :auto_generated_blocks, grammar: grammar)
      b2 = FactoryBot.create(:block_language, :auto_generated_blocks, grammar: grammar)

      changed = related.regenerate_immediate_dependants!(ide_service: IdeService.guaranteed_instance)
      expect(changed).to match_array [grammar, b1, b2]
    end

    it "with a single grammar that affects two block languages (mixed)" do
      related = FactoryBot.create(:code_resource, :grammar_single_type)
      grammar = FactoryBot.create(:grammar, generated_from: related)
      b1 = FactoryBot.create(:block_language, grammar: grammar)
      b2 = FactoryBot.create(:block_language, :auto_generated_blocks, grammar: grammar)

      changed = related.regenerate_immediate_dependants!(ide_service: IdeService.guaranteed_instance)
      expect(changed).to match_array [grammar, b2]
    end
  end

  it "project is required" do
    res = FactoryBot.build(:code_resource, project: nil)

    res.validate
    expect(res.errors[:project].length).to be 1
  end

  it "block language is required" do
    res = FactoryBot.build(:code_resource, block_language: nil)

    res.validate
    expect(res.errors[:block_language].length).to be 1
  end

  it "does not use block languages that are not part of the project" do
    p = FactoryBot.build(:project)
    res = FactoryBot.build(:code_resource, project: p)
    res.block_language = FactoryBot.build(:block_language)

    expect(res.validate).to be false
    expect(res.errors[:block_language].length).to be 1
  end

  it "prints a readable identification" do
    res = FactoryBot.create(:code_resource)
    readable = res.readable_identification
    expect(readable).to include res.id
    expect(readable).to include res.name
  end
end
