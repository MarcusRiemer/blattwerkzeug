class Resolvers::BaseResolver < GraphQL::Schema::Resolver
  include Resolvers::BaseQueryBuilderMethods

  def scope_query(
    model_class,
    scope:,
    fallback_order_field:, fallback_order_dir:, context: nil,
    filter: nil,
    languages: nil,
    order: nil
  )
    @model_class = model_class
    @context = context
    @languages = relevant_languages(languages)
    @order_dir = fallback_order_dir
    @order_field = fallback_order_field

    scope_1_column = select_relevant_fields(scope)
    scope_2_filtered = apply_filter(scope_1_column, filter)
    scope_3_ordered = apply_order(scope_2_filtered, order)

    # TODO: This should happen when loading queries from disk, not for every query
    return include_related(scope_3_ordered, context.query.query_string) if context and context.query

    raise EsqulinoError::Base, 'Resolver query without query context'
  end

  def current_user
    context[:user]
  end
end
