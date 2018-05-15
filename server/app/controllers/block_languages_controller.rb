class BlockLanguagesController < ApplicationController
  # List all existing block languages
  def index
    render :json => BlockLanguage.all.map{|b| b.to_list_api_response}
  end

  # Create a new block language
  def create
    block_lang = BlockLanguage.new(basic_params)
    block_lang.model = model_params

    if block_lang.save
      render :json => { 'id' => block_lang.slug }
    else
      render :json => { 'errors' => block_lang.errors }, status: 400
    end
  end

  # Updates an existing block language
  def update
    block_lang = BlockLanguage.find(id_params['id'])
    block_lang.update basic_params
    block_lang.model = model_params

    if block_lang.save
      render status: 204
    else
      render json: { 'errors' => block_lang.errors }, :status => 400
    end
  end

  private

  # These parameters may be used to identify a block language
  def id_params
    params.
      permit(:id, :slug)
  end

  # These parameters are "normal" table attributes
  def basic_params
    params
      .permit([:name, :slug, :defaultProgrammingLanguageId, :family, :grammarId])
      .transform_keys { |k| k.underscore }
  end

  # These parameters need to be put in the json-blob
  def model_params
    # Allowing an array of arbitrary objects seems to be unsupported
    # by the strong parameters API :(
    params
      .to_unsafe_hash.slice(:sidebars, :editorBlocks, :editorComponents)
  end

end
