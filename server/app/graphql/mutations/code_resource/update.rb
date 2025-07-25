class Mutations::CodeResource::Update < Mutations::BaseMutation
  def self.default_graphql_name
    "CodeResourceUpdate"
  end

  argument :id, ID, required: true
  argument :name, String, required: true
  argument :assignment, String, required: false
  argument :ast, Types::Scalar::NodeDescription, required: false
  argument :block_language_id, ID, required: true
  argument :programming_language_id, ID, required: true


  class UpdateAffectedResourceType < Types::Base::BaseUnion
    possible_types Types::GrammarType, Types::BlockLanguageType

    def self.resolve_type(object, context)
      if object.is_a? Grammar
        Types::GrammarType
      elsif object.is_a? BlockLanguage
        Types::BlockLanguageType
      else
        raise EsqulinoError::Base.new("Unknown type in union: #{object.class.name}", 500)
      end
    end
  end

  def self.ensure_educational_permission!(current_user, resource)
    if !ProjectPolicy.new(current_user, resource).educational?
      raise EsqulinoError::Authorization.new("You are not allowed to change educational properties")
    end
  end

  field :code_resource, Types::CodeResourceType, null: false
  field :affected, [UpdateAffectedResourceType], null: false

  def resolve(id:, name:, ast:, block_language_id:, programming_language_id:, assignment: nil)
    resource = CodeResource.find_by!(id: id)

    self.class.ensure_educational_permission!(current_user, resource) if assignment.present?

    affected = resource.update_this_and_dependants!(
      name: name,
      assignment: assignment,
      ast: ast,
      block_language_id: block_language_id,
      programming_language_id: programming_language_id
    )

    return {
      code_resource: resource,
      affected: affected,
    }
  end
end