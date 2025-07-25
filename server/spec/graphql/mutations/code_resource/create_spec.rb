require "rails_helper"

RSpec.describe Mutations::CodeResource::Create do
  # These specs rely on
  # * an existing guest user
  before(:each) do
    create(:user, :guest)
  end

  def relevant_attributes(code_resource)
    code_resource.attributes.slice(
      "project_id", "name", "assignment", "ast", "block_language_id", "programming_language_id"
    )
  end

  def execute_args(code_resource, user: nil)
    if user.nil?
      user = code_resource.project.user
    end

    attributes = relevant_attributes(code_resource).transform_keys { |k| k.camelize(:lower) }

    {
      operation_name: "CreateCodeResource",
      variables: attributes,
      user: user
    }
  end

  fit "As admin: creates a code resource with an assignment" do
    admin = create(:user, :admin)
    project = create(:project, user: admin)
    block_language = create(:block_language)
    programming_language = create(:programming_language)
    resource = FactoryBot.build(:code_resource,
      project: project,
      block_language: block_language,
      programming_language: programming_language,
      assignment: "Initial"
    )

    res = execute_query(**execute_args(resource, user: admin))
    data = res.dig("data", "createCodeResource", "codeResource")

    aggregate_failures do
      expect(data['name']).to eq resource.name
      expect(data['assignment']).to eq resource.assignment
      expect(data['ast']).to eq resource.ast
      expect(data['blockLanguageId']).to eq resource.block_language_id
      expect(data['programmingLanguageId']).to eq resource.programming_language_id
    end
  end

  fit "As owner: does not create a code resource with an assignment" do
    project = create(:project)
    block_language = create(:block_language)
    programming_language = create(:programming_language)
    resource = FactoryBot.build(:code_resource,
      project: project,
      block_language: block_language,
      programming_language: programming_language,
      assignment: "Initial"
    )

    expect {
      execute_query(**execute_args(resource))
    }.to raise_error(EsqulinoError::Authorization)
  end

  fit "As owner: does create a code resource without an assignment" do
    project = create(:project)
    block_language = create(:block_language)
    programming_language = create(:programming_language)
    resource = FactoryBot.build(:code_resource,
      project: project,
      block_language: block_language,
      programming_language: programming_language,
    )

    res = execute_query(**execute_args(resource))
    data = res.dig("data", "createCodeResource", "codeResource")

    aggregate_failures do
      expect(relevant_attributes(CodeResource.find(data['id']))).to eq relevant_attributes(resource)

      expect(data['name']).to eq resource.name
      expect(data['assignment']).to eq resource.assignment
      expect(data['ast']).to eq resource.ast
      expect(data['blockLanguageId']).to eq resource.block_language_id
      expect(data['programmingLanguageId']).to eq resource.programming_language_id
    end
  end
end