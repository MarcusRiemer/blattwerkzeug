class Mutations::CodeResource::AiHint < Mutations::BaseMutation
  def self.default_graphql_name
    "CodeResourceAiHint"
  end

  argument :id, ID, required: true

  field :answer_text, String, null: false

  def resolve(id:)
    resource = CodeResource.find_by!(id: id)

    authorize resource.project, :ai_hint?

    {
      answer_text: "Hello from AI, this is \"#{resource.name}\""
    }
  end
end