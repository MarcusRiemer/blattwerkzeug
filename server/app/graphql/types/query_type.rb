module Types
  class QueryType < GraphQL::Schema::Object

    field :programmingLanguages, Types::ProgrammingLanguageType.connection_type, null: false

    field :blockLanguages, Types::BlockLanguageType.connection_type, null: false do
      argument :input, Types::BlockLanguageType::InputType,required:false
    end
    field :singleBlockLanguage, Types::BlockLanguageDescriptionType, null:false do
      argument :id, ID,required:true
    end

    field :grammars, Types::GrammarType.connection_type, null: false do
      argument :input, Types::GrammarType::InputType, required: false
    end
    field :singleGrammar, Types::GrammarType, null: false do
      argument :id, ID,required:true
    end

    field :codeResources, Types::CodeResourceType.connection_type,null:false do
      argument :input, Types::CodeResourceType::InputType, required: false
    end
    field :news, Types::NewsType.connection_type,null:false do
      argument :input, Types::NewsType::InputType, required: false
    end
    field :singleNews, Types::NewsType,null:false do
      argument :id, ID,required:true
    end
    field :projectDatabases, Types::ProjectDatabaseType.connection_type,null:false
    field :projectSources, Types::ProjectSourceType.connection_type,null:false
    field :projects, Types::ProjectType.connection_type, null: false do
      argument :input, Types::ProjectType::InputType, required: false
    end
    field :singleProject, Types::ProjectType,null:false do
      argument :id, ID,required:true
    end

    def programming_languages
      ProgrammingLanguage.all
    end

    def block_languages(input:nil)
      if input
        Resolvers::BlockLanguageResolver::new(context:@context,**input).scope
      else
        Resolvers::BlockLanguageResolver::new(context:@context).scope
      end
    end

    def single_block_language(id:)
      BlockLanguage.find(id).to_full_api_response.transform_keys {|a| a.underscore}
    end

    def code_resources(input:nil)
      if input
        Resolvers::CodeResourceResolver::new(context:@context,**input).scope
      else
        Resolvers::CodeResourceResolver::new(context:@context).scope
      end
    end
    #admin single news
    def single_news(id:)
      News.find(id).to_full_api_response.transform_keys {|a| a.underscore}
    end

    def news(input:nil)
      if input
        Resolvers::NewsResolver::new(context:@context,**input).scope
      else
        Resolvers::NewsResolver::new(context:@context).scope
      end
    end

    def project_databases
      ProjectDatabase.all
    end

    def project_sources
      ProjectSource.all
    end

    def single_project(id:)
      if BlattwerkzeugUtil::string_is_uuid? id
        Project.full.find(id)
      else
        Project.full.find_by! slug: id
      end
    end

    def projects(input:nil)
      if input
        Resolvers::ProjectsResolver::new(context:@context,**input).scope
      else
        Resolvers::ProjectsResolver::new(context:@context).scope
      end
    end
    def single_grammar(id:)
      if BlattwerkzeugUtil::string_is_uuid? id
        Grammar.find(id)
      else
        Grammar.find_by! slug: id
      end
    end

    def grammars(input:nil)
      if input
        Resolvers::GrammarsResolver::new(**input).scope
      else
        Resolvers::GrammarsResolver::new.scope
      end
    end
  end
end
