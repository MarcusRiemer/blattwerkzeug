require "rails_helper"

RSpec.fdescribe Resolvers::RelatedModelsVisitor do
  it "Only scalars" do
    query_string = <<-EOQ
      query AdminListGrammars {
        grammars {
          nodes {
            name,
            id
          }
        }
      }
    EOQ

    includes = Resolvers::RelatedModelsVisitor.calculate query_string, Grammar
    expect(includes).to eq({})
  end

  it "One level" do
    query_string = <<-EOQ
      query AdminListGrammars {
        grammars {
          nodes {
            name
            generatedFrom {
              name
            }
          }
        }
      }
    EOQ

    includes = Resolvers::RelatedModelsVisitor.calculate query_string, Grammar
    expect(includes).to eq({ "generated_from" => {} })
  end

  it "One level, but twice" do
    query_string = <<-EOQ
      query AdminListGrammars {
        grammars {
          nodes {
            name
            generatedFrom {
              name
            },
            codeResources {
              nodes {
                name
              }
            }
          }
          totalCount
        }
      }
    EOQ

    includes = Resolvers::RelatedModelsVisitor.calculate query_string, Grammar
    expect(includes).to eq({ "generated_from" => {}, "code_resources" => {} })
  end

  it "One level, invalid association" do
    query_string = <<-EOQ
      query AdminListGrammars {
        grammars {
          nodes {
            name
            nonExistant {
              name
            }
          }
        }
      }
    EOQ

    expect { Resolvers::RelatedModelsVisitor.calculate query_string, Grammar }.to raise_error(RuntimeError)
  end

  it "Two levels nested, surrounded by scalars" do
    query_string = <<-EOQ
      query AdminListGrammars {
        grammars {
          nodes {
            name
            generatedFrom {
              name
              project {
                name
              }
              id
            }
            id
          }
          totalCount
        }
      }
    EOQ

    includes = Resolvers::RelatedModelsVisitor.calculate query_string, Grammar
    expect(includes).to eq({ "generated_from" => { "project" => {} } })
  end

  it "Two levels, invalid nested association" do
    query_string = <<-EOQ
      query AdminListGrammars {
        grammars {
          nodes {
            name
            generatedFrom {
              name,
              nonExistant {
                name
              }
            }
          }
        }
      }
    EOQ

    expect { Resolvers::RelatedModelsVisitor.calculate query_string, Grammar }.to raise_error(RuntimeError)
  end
end