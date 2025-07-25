require "rails_helper"

RSpec.describe Mutations::CodeResource::Update do
  # These specs rely on
  # * an existing guest user
  before(:each) do
    create(:user, :guest)
  end

  def execute_args(code_resource, user: nil)
    if user.nil?
      user = code_resource.project.user
    end

    attributes = code_resource.attributes.slice(
      "id", "name", "assignment", "ast", "block_language_id", "programming_language_id"
    ).transform_keys { |k| k.camelize(:lower) }

    {
      operation_name: "UpdateCodeResource",
      variables: attributes,
      user: user
    }
  end

  it "changes the name" do
    resource = FactoryBot.create(:code_resource, name: "Initial")
    resource.name = "Changed"

    res = execute_query(**execute_args(resource))
    data = res.dig("data", "updateCodeResource", "codeResource")
    affected = res.dig("data", "updateCodeResource", "affected")

    aggregate_failures do
      resource.reload
      expect(resource.name).to eq "Changed"
      expect(data['name']).to eq "Changed"
      expect(affected).to eq []
    end
  end

  it "As admin: changes the assignment" do
    admin = create(:user, :admin)
    resource = FactoryBot.create(:code_resource, assignment: "Initial")
    resource.assignment = "Changed"

    res = execute_query(**execute_args(resource, user: admin))
    data = res.dig("data", "updateCodeResource", "codeResource")
    affected = res.dig("data", "updateCodeResource", "affected")

    aggregate_failures do
      resource.reload
      expect(resource.assignment).to eq "Changed"
      expect(data['assignment']).to eq "Changed"
      expect(affected).to eq []
    end
  end


  it "As owner: does not change the assignment" do
    resource = FactoryBot.create(:code_resource, assignment: "Initial")
    resource.assignment = "Changed"

    expect {
      execute_query(**execute_args(resource))
    }.to raise_error(EsqulinoError::Authorization)

    resource.reload
    expect(resource.assignment).to eq "Initial"
  end

  it "changes the programming language" do
    new_lang = FactoryBot.create(:programming_language)
    resource = FactoryBot.create(:code_resource, name: "Initial")
    resource.programming_language = new_lang

    res = execute_query(**execute_args(resource))
    data = res.dig("data", "updateCodeResource", "codeResource")
    affected = res.dig("data", "updateCodeResource", "affected")

    aggregate_failures do
      resource.reload
      expect(resource.programming_language).to eq new_lang
      expect(data['programmingLanguageId']).to eq new_lang.id
      expect(affected).to eq []
    end
  end

  it "removes an existing AST" do
    resource = FactoryBot.create(:code_resource, :grammar_single_type)
    resource.ast = nil

    res = execute_query(**execute_args(resource))
    data = res.dig("data", "updateCodeResource", "codeResource")
    affected = res.dig("data", "updateCodeResource", "affected")

    aggregate_failures do
      resource.reload
      expect(resource.ast).to eq nil
      expect(data['ast']).to eq nil
      expect(affected).to eq []
    end
  end

  it "sets a new AST" do
    new_ast = { "language" => "l", "name" => "r" }
    resource = FactoryBot.create(:code_resource, :grammar_single_type)
    resource.ast = new_ast

    res = execute_query(**execute_args(resource))
    data = res.dig("data", "updateCodeResource", "codeResource")
    affected = res.dig("data", "updateCodeResource", "affected")

    aggregate_failures do
      resource.reload
      expect(resource.ast).to eq new_ast
      expect(data['ast']).to eq new_ast
      expect(affected).to eq []
    end
  end

  it "updates a related grammar" do
    related = FactoryBot.create(:code_resource, :grammar_single_type)
    grammar = FactoryBot.create(:grammar, generated_from: related)

    related.name = "Changed"

    res = execute_query(**execute_args(related))
    data = res.dig("data", "updateCodeResource", "codeResource")
    affected = res.dig("data", "updateCodeResource", "affected")

    aggregate_failures do
      related.reload
      expect(related.name).to eq "Changed"
      expect(data['name']).to eq "Changed"
      expect(affected.pluck "id").to eq [grammar.id]
    end
  end

  it "updates a related grammar with its block language" do
    related = FactoryBot.create(:code_resource, :grammar_single_type)
    grammar = FactoryBot.create(:grammar, generated_from: related)
    block_lang = FactoryBot.create(:block_language, :auto_generated_blocks, grammar: grammar)

    related.name = "Changed"

    res = execute_query(**execute_args(related))
    data = res.dig("data", "updateCodeResource", "codeResource")
    affected = res.dig("data", "updateCodeResource", "affected")

    aggregate_failures do
      related.reload
      expect(related.name).to eq "Changed"
      expect(data['name']).to eq "Changed"
      expect(affected.pluck "id").to eq [grammar.id, block_lang.id]
    end
  end
end