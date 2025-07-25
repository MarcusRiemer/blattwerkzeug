class Mutations::CodeResource::Create < Mutations::BaseMutation
  def self.default_graphql_name
    "CodeResourceCreate"
  end

  argument :name, String, required: true
  argument :assignment, String, required: false
  argument :project_id, ID, required: true
  argument :block_language_id, ID, required: true
  argument :programming_language_id, ID, required: true

  field :code_resource, Types::CodeResourceType, null: false

  def resolve(**args)
    project = Project.find_by!(id: args[:project_id])
    Mutations::CodeResource::Update.ensure_educational_permission!(current_user, project) if args[:assignment].present?

    return {
      code_resource: CodeResource.create!(args)
    }
  end
end
