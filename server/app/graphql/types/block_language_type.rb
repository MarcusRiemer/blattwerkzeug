
module Types
  class Types::BlockLanguageType < GraphQL::Schema::Object
    field :name, String, null:false
    field :model, Types::Json, null:true
    field :createdAt, Types::Datetime, null:false
    field :updatedAt, Types::Datetime, null:false
    field :slug, String, null:true
    field :defaultProgrammingLanguage, Types::ProgrammingLanguageType,null:true
  end
end
