class Mutations::CodeResource::AiHint < Mutations::BaseMutation
  def self.default_graphql_name
    "CodeResourceAiHint"
  end

  argument :id, ID, required: true

  field :answer_text, String, null: false

  def resolve(id:)
    resource = CodeResource.find_by!(id: id)

    authorize resource.project, :ai_hint?

    prompt = generate_ai_prompt(resource)

    {
      answer_text: query_ai(prompt)
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

  # Generates a prompt for the AI to help with the code resource.
  def generate_ai_prompt(resource)
    assignment = resource.assignment
    #TODO: Problem bei beiden: Backend AST nur aktuell, wenn CodeResource gespeichert wurde. Nähere Diskussion dazu in code_resource.rb
    # Abgesehen von Autosave, könnte der AST vom Frontend beim Aufruf der Methode mitegegeben werden.
    generated_code = resource.compiled 
    # oder
    # generated_code = IdeService.instance.emit_code(resource.ast, resource.block_language.default_programming_language_id)

    available_tables = find_available_tables(resource.project)

    available_blocks = find_available_blocks(resource.block_language)

    prompt = "Nimm die Rolle eines Lehrers ein und hilf mir bei folgender Aufgabe. Das Ziel ist es am Ende einen fertigen Codeabschnitt zu haben, der die Aufgabe erfüllt.\n"
    prompt += "Meine Aufgabe lautet: #{assignment}\n" if assignment.present?
    prompt += "Ich möchte nun dafür diesen Code vervollständigen:\n#{generated_code}\n"
    # TODO: Das wäre auch in einem Systemprompt besser aufgebhoben, wobei ich unsicher bin, ob sich ein Systemprompt pro Aufgabe ändern kann.
    if available_tables.length > 0
      prompt += "Hier sind alle Tabellen und Felder, die ich nutzen kann:\n"
      available_tables.each do |table|
        prompt += "- Tabelle: #{table[:name]}, Felder: #{table[:fields].join(', ')}\n"
      end
    end
    # TODO: Das eig auch eher in einen Systemprompt?
    if available_blocks.length > 0
      prompt += "Hier sind alle verfügbaren Code-Blöcke, die ich nutzen kann:\n"
      available_blocks.each do |block|
        prompt += "- Kategorie: #{block[:category]}, Blöcke: #{block[:blocks].join(', ')}\n"
      end
    end

    # TODO: Sowas fehlt mir noch, das generiere ich eigentlich im Frontend selbst, daher müsste das vrmtl auch mit übergeben werden?
    # prompt += "Dafür habe ich zuletzt diesen Codeabschnitt genutzt: ...\n"
    # prompt += "Dabei habe ich ... Löcher in meinem Code, die ich noch füllen muss.\n"

    # TODO: Die Rules könnten auch in einen Systemprompt ausgelagert werden, um sie nicht bei jeder Anfrage zu wiederholen.
    prompt += <<~RULES
      Für deine Antworten gelten folgende Regeln:
      Bei Join Operationen wird der Code-Block INNER JOIN ON präferiert.
      Bitte gib mir Feedback zu meinem aktuellen Code und wie ich weitermachen sollte, aber gib mir aber nicht die Lösung vor, sondern nur Hinweise.
      Halte deine Antwort so kurz wie möglich und konzentriere dich auf den nächsten Code-Block, den ich nutzen sollte.

      Bitte nenne mir wirklich nur einen einzigen nächsten Code-Block, den ich als Nächstes einsetzen sollte – nicht mehr.
      Bitte nenne mir nur Code-Blöcke, die ich zur Verfügung habe. Tabellen oder Tabellenspalten zählen auch jeweils als ein Code-Block.
      Überlege auch bitte gründlich, ob der Code vielleicht sogar schon vollständig ist.
      WICHTIG: Die COUNT()-Funktionen mit leeren Klammern sind bereits korrekt implementiert und sollen nicht kommentiert werden.
    RULES

    prompt.strip
  end

  # Finds all tables and their fields in the project databases.
  # @param project [Project]
  #   The project to search in
  # @return [Array] An array with table names and their fields
  def find_available_tables(project)
    database = project.default_database
    return [] unless database&.schema
    
    database.schema.map do |table|
      {
        name: table["name"],
        fields: table["columns"].map { |col| col["name"] }
      }
    end
  end

  # Finds all blocks available in the given block language.
  # @param block_language [BlockLanguage]
  #   The block language to search in
  # @return [Array] An array with categories and their blocks
  def find_available_blocks(block_language)
     available_blocks = []

    if block_language.sidebars
      # fixed_blocks is the sidebar that contains the available blocks
      fixed_blocks_sidebars = block_language.sidebars.filter { |sidebar| sidebar["type"] == "fixedBlocks" }
      
      fixed_blocks_sidebars.each do |sidebar|
        if sidebar["categories"]
          sidebar["categories"].each do |category|
            available_blocks << {
              category: category["categoryCaption"],
              blocks: category["blocks"].map { |block| block["displayName"] }
            }
          end
        end
      end
    end
    return available_blocks
  end
end