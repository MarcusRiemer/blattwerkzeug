module Types
  class Types::CodeResourceType < Types::Base::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :ast, Types::Scalar::NodeDescription, null: true
    field :project, Types::ProjectType, null: false
    field :block_language, Types::BlockLanguageType, null: false
    field :block_language_id, ID, null: false
    field :programming_language, Types::ProgrammingLanguageType, null: false
    field :programming_language_id, ID, null: false
    field :compiled, String, null: true
    field :assignment, String, null: true

    field :generated_grammars, [Types::GrammarType], null: true

    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false

    class OrderFieldEnum < Types::Base::BaseEnum
      graphql_name 'CodeResourceOrderFieldEnum'
      # Order Fields
      value 'name'
    end

    class OrderType < Types::Base::BaseInputObject
      graphql_name 'CodeResourceOrderType'
      argument :orderField, OrderFieldEnum, required: false
      argument :orderDirection, Types::Base::BaseEnum::OrderDirectionEnum, required: false
    end

    # Can be used if name field become multilingual
    class MultilingualColumnsEnum < Types::Base::BaseEnum
      graphql_name 'CodeResourceMultilingualColumnsEnum'
    end

    class FilterFieldType < Types::Base::BaseInputObject
      graphql_name 'CodeResourceFilterFieldType'
      argument :id, type: ID, required: false
      argument :name, type: String, required: false
      argument :programmingLanguageId, type: ID, required: false
    end

    class InputType < Types::Base::BaseInputObject
      graphql_name 'CodeResourceInputType'
      argument :order, OrderType, required: false
      argument :filter, FilterFieldType, required: false
      argument :languages, [Types::Base::BaseEnum::LanguageEnum], required: false
    end
  end
end
