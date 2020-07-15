
module Resolvers
  class BlockLanguageResolver < BaseResolver

    attr_reader(:scope)

    def initialize(context:nil,filter:nil,order:nil,languages:nil)
      # query context instance of GraphQL::Query::Context
      scope = BlockLanguage.scope_list

        #requested_columns(context).filter {|c| c.ends_with?("_id")}.each do |col|
        #table = col[0,col.length-3].to_sym
        #       scope = scope.left_joins(table).select(' grammars.id AS grammar_id').group('block_languages.id, grammars.id')
        #
        #end

      unless (requested_columns(context) & ["grammar_id"]).empty?
        # grammar_name will be used for field resolving in block_language_type.rb
        # Used to solve n+1 query problem
        scope = scope.left_joins(:grammar).select(' grammars.id AS grammar_id').group('block_languages.id, grammars.id')
      end

      super(BlockLanguage,context:context,scope:scope,filter:filter,order:order,languages:languages)
    end

    def default_order_field
      "name"
    end

  end
end
