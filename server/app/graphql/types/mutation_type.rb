module Types
  class MutationType < Types::Base::BaseObject
    field :create_grammar, mutation: Mutations::Grammar::CreateGrammar
    field :update_grammar, mutation: Mutations::Grammar::UpdateGrammar
    field :destroy_grammar, mutation: Mutations::Grammar::DestroyGrammar
    field :regenerate_foreign_types, mutation: Mutations::Grammar::RegenerateForeignTypes
    field :create_block_language, mutation: Mutations::BlockLanguage::CreateBlockLanguage
    field :update_block_language, mutation: Mutations::BlockLanguage::UpdateBlockLanguage
    field :destroy_block_language, mutation: Mutations::BlockLanguage::DestroyBlockLanguage
    field :create_news, mutation: Mutations::News::CreateNews
    field :update_news, mutation: Mutations::News::UpdateNews
    field :destroy_news, mutation: Mutations::News::DestroyNews
    field :create_project, mutation: Mutations::Projects::CreateProject
  end
end
