class Mutations::CodeResource::AiHint < Mutations::BaseMutation
  def self.default_graphql_name
    "CodeResourceAiHint"
  end

  argument :id, ID, required: true

  field :answer_text, String, null: false

  def resolve(id:)
    resource = CodeResource.find_by!(id: id)

    authorize resource.project, :ai_hint?

    {
      answer_text: query_ai("Hallo, schreibe bitte ein SQL Gedicht über folgende Aufgabe: #{resource.name}")
    }
  end

  def query_ai(message)
    access_token = ENV["OPEN_AI_API_KEY"]
    raise(EsqulinoError::Base, "Missing Open AI Key") if access_token == nil

    client = OpenAI::Client.new(
      access_token: access_token,
      log_errors: true # Highly recommended in development, so you can see what errors OpenAI is returning. Not recommended in production because it could leak private data to your logs.
    )

    response = client.chat(
      parameters: {
        model: "gpt-4o",
        messages: [{ role: "user", content: message}],
        temperature: 0.7,
      }
    )

    response.dig("choices", 0, "message", "content")
  end
end