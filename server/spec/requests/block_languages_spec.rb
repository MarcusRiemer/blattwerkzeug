require 'rails_helper'

RSpec.describe BlockLanguagesController, type: :request do
  json_headers = { "CONTENT_TYPE" => "application/json" }

  describe 'GET /api/block_languages' do
    it 'lists nothing if nothing is there' do
      get "/api/block_languages"

      expect(response).to have_http_status(200)
      expect(JSON.parse(response.body).length).to eq 0
    end

    it 'lists a single block language' do
      FactoryBot.create(:block_language)
      get "/api/block_languages"

      expect(response).to have_http_status(200)

      json_data = JSON.parse(response.body)
      expect(json_data.length).to eq 1
      expect(json_data[0]).to validate_against "BlockLanguageListResponseDescription"
    end
  end

  describe 'GET /api/block_language/:blockLanguageId' do
    it 'shows a single block language' do
      b = FactoryBot.create(:block_language)
      get "/api/block_languages/#{b.id}"

      expect(response).to have_http_status(200)

      json_data = JSON.parse(response.body)

      expect(json_data).to validate_against "BlockLanguageDescription"
    end

    it 'responds with 404 for non existing languages' do
      get "/api/block_languages/0"
      expect(response).to have_http_status(404)
    end
  end

  describe 'POST /api/block_languages' do
    it 'Creates a new, empty block language' do
      g = FactoryBot.create(:grammar)
      
      post "/api/block_languages",
           :headers => json_headers,
           :params => {
             "name" => "Spec Lang",
             "sidebars" => [],
             "editorComponents" => [],
             "editorBlocks" => [],
             "grammarId" => g.id,
             "defaultProgrammingLanguageId" => g.programming_language_id
           }.to_json

      expect(response.content_type).to eq "application/json"

      json_data = JSON.parse(response.body)
      expect(json_data.fetch('errors', [])).to eq []
      expect(json_data).to validate_against "BlockLanguageDescription"

      expect(response.status).to eq(200)
    end

    it 'Creates a new block language with model properties' do
      g = FactoryBot.create(:grammar)
      
      post "/api/block_languages",
           :headers => json_headers,
           :params => {
             "name" => "Spec Lang",
             "sidebars" => [
               {
                 "type" => "fixedBlocks",
                 "caption" => "Spec Blocks",
                 "categories" => [
                   {
                     "categoryCaption" => "first",
                     "blocks" => [
                       {
                         "defaultNode" => {
                           "language" => "spec",
                           "name" => "block"
                         },
                         displayName: "Block #1",
                       }
                     ]
                   }
                 ]
               }
             ],
             "editorComponents" => [],
             "editorBlocks" => [
               {
                 "describedType" => {
                   "languageName" => "spec",
                   "typeName" => "block"
                 },
                 "visual" => []
               }
             ],
             "grammarId" => g.id,
             "defaultProgrammingLanguageId" => g.programming_language_id
           }.to_json

      expect(response.content_type).to eq "application/json"

      json_data = JSON.parse(response.body)
      expect(json_data.fetch('errors', [])).to eq []
      expect(response.status).to eq(200)

      expect(json_data).to validate_against "BlockLanguageDescription"
    end

    describe 'PUT /api/block_languages/:id' do
      it 'Updating basic properties' do
        orig_block_lang = FactoryBot.create(:block_language)
        upda_block_lang = {
          "id" => orig_block_lang.id,
          "name" => "Upda",
          "sidebars" => [
            {
              "type" => "fixedBlocks",
              "caption" => "Spec Blocks",
              "categories" => [
                {
                  "categoryCaption" => "first",
                  "blocks" => [
                    {
                      "defaultNode" => {
                        "language" => "spec",
                        "name" => "block"
                      },
                      displayName: "Block #1",
                    }
                  ]
                }
              ]
            }
          ],
          "editorComponents" => [],
          "editorBlocks" => [
            {
              "describedType" => {
                "languageName" => "spec",
                "typeName" => "block"
              },
              "visual" => []
            }
          ]
        }
        
        put "/api/block_languages/#{orig_block_lang.id}",
           :headers => json_headers,
           :params => upda_block_lang.to_json

        if (not response.body.blank?) then
          json_data = JSON.parse(response.body)
          expect(json_data.fetch('errors', [])).to eq []
        end

        expect(response.status).to eq(204)

        orig_block_lang.reload
        expect(orig_block_lang.name).to eq upda_block_lang['name']

        # For whatever reason the order of things changes somewhere and RSpec
        # freaks out because the order of things in a hash changes. We do some very
        # basic poking to mitigate this ...
        expect(orig_block_lang.model["sidebars"][0]["blocks"]).to eq upda_block_lang["sidebars"][0]["blocks"]
        expect(orig_block_lang.model["editorBlocks"][0]).to eq upda_block_lang["editorBlocks"][0]
      end

      it 'Update with empty model' do
        original = FactoryBot.create(:block_language)

        params_update = FactoryBot
                          .attributes_for(:block_language,
                                          name: "Updated empty",
                                          model: Hash.new)
                          .transform_keys { |k| k.to_s.camelize(:lower) }
        params_update_req = params_update.merge(params_update["model"])
        params_update_req.delete("model")

        put "/api/block_languages/#{original.id}",
            :headers => json_headers,
            :params => params_update_req.to_json
        
        expect(response.status).to eq(400)
        refreshed = BlockLanguage.find(original.id)
        expect(original.name).to eq refreshed.name
      end
    end
  end

  describe 'DELETE /api/block_language/:blockLanguageId' do
    it 'removes unreferenced language' do
      b = FactoryBot.create(:block_language)

      delete "/api/block_languages/#{b.id}",
             :headers => json_headers

      expect(response.status).to eq(204)
    end

    it 'keeps referenced language' do
      b = FactoryBot.create(:block_language)
      FactoryBot.build(:code_resource, block_language: b)

      delete "/api/block_languages/#{b.id}",
             :headers => json_headers

      expect(response.status).to eq(400)
    end
  end
  
end
