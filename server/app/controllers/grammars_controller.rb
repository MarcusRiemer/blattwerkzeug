require_dependency 'util'

# Manages operations on grammars
class GrammarsController < ApplicationController
  # List all existing grammars
  def index
    render :json => Grammar.scope_list.map{|g| g.to_list_api_response}
  end

  # Find a single grammar
  def show
    needle = id_params[:id]

    grammar = if (string_is_uuid? needle) then
                Grammar.find(needle)
              else
                Grammar.find_by! slug: needle
              end

    render json: grammar.to_full_api_response
  end

  # Creates a new grammar
  def create
    grammar = Grammar.new(basic_params)
    grammar.model = model_params

    if grammar.save
      render :json => { 'id' => grammar.id }
    else
      render :json => { 'errors' => grammar.errors.as_json }, status: 400
    end
  end

  # Updates an existing grammar
  def update
    grammar = Grammar.find(id_params['id'])
    grammar.assign_attributes basic_params
    grammar.model = model_params

    if grammar.save
      render status: 204
    else
      render json: { 'errors' => grammar.errors.as_json }, :status => 400
    end
  end

  # Deletes an existing grammar. If the grammar still has references,
  # the deletion process fails.
  def destroy
    grammar = Grammar.find(id_params['id'])
    begin
      grammar.destroy!
      render status: 204
    rescue ActiveRecord::InvalidForeignKey
      render json: { 'errors' => ['EXISTING_REFERENCES'] }, :status => 400
    end
  end

  # Finds block languages that are related to this grammar
  def related_block_languages
    render :json => BlockLanguage.scope_list
                      .where(grammar_id: id_params[:id])
                      .map{|b| b.to_list_api_response}
  end

  private

  # These parameters may be used to identify a grammar
  def id_params
    params.
      permit(:id, :slug)
  end


  # These parameters are "normal" table attributes
  def basic_params
    params
      .permit([:name, :slug, :programmingLanguageId])
      .transform_keys { |k| k.underscore }
  end

  # These parameters need to be put in the json-blob
  def model_params
    # Allowing an array of arbitrary objects seems to be unsupported
    # by the strong parameters API :(
    params
      .to_unsafe_hash.slice(:types, :root)
  end

end
