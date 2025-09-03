class Mutations::CodeResource::AiHint < Mutations::BaseMutation
  def self.default_graphql_name
    "CodeResourceAiHint"
  end

  argument :id, ID, required: true
  argument :compiled_source, String, required: true
  argument :last_dragged_block, String, required: false

  field :answer_text, String, null: false
  field :next_block, String, null: false

  def resolve(id:, compiled_source:, last_dragged_block: nil)
    resource = CodeResource.find_by!(id: id)

    authorize resource.project, :ai_hint?

    prompt_dev = generate_dev_prompt(resource, compiled_source)
    prompt_user = generate_user_prompt(resource, compiled_source, last_dragged_block)

    ai_hint = query_ai(prompt_dev, prompt_user)

    {
      answer_text: "#{ai_hint[:explanation]}\n", next_block: "#{ai_hint[:next_block]}"
    }
  end

  def query_ai(message_dev, message_user)
    access_token = ENV["OPEN_AI_API_KEY"]
    raise(EsqulinoError::Base, "Missing Open AI Key") if access_token == nil

    client = OpenAI::Client.new(
      access_token: access_token,
      log_errors: true # Highly recommended in development, so you can see what errors OpenAI is returning. Not recommended in production because it could leak private data to your logs.
    )

    response = client.chat(
      parameters: {
        model: "gpt-4o",
        messages: [{role: "developer",content: message_dev},{ role: "user", content: message_user}],
        temperature: 0.7,
      }
    )
    begin
      content= response.dig("choices", 0, "message", "content")
      clean = content.gsub(/```(?:json)?/, "").strip
      JSON.parse(clean, symbolize_names: true) # => {:explanation=>"…", :next_block=>"…"}

    rescue JSON::ParserError => e
      Rails.logger.error("AI lieferte kein valides JSON: #{e.message}, content=#{content.inspect}")
      { explanation: "Konnte Hinweis nicht verarbeiten.", next_block: "" }
    end
  end


  # Generates a user prompt for the AI to help with the code resource.
  def generate_user_prompt(resource, compiled_source, last_dragged_block)
    assignment = resource.assignment
   
    generated_code = compiled_source # Received from client, to make sure it is the current compiled code and not the last saved code

    prompt = "Meine Aufgabe lautet: #{assignment}\n" if assignment.present?
    prompt += "Ich möchte nun dafür diesen Code vervollständigen:\n#{generated_code}\n"

    prompt += "Dafür habe ich zuletzt den folgenden Code-Block verwendet: \"#{last_dragged_block}\"" if last_dragged_block

    # TODO: Still missing, have to receive this from client
    # prompt += "Dabei habe ich ... Löcher in meinem Code, die ich noch füllen muss.\n"
    # prompt += "Außerdem habe ich ... Fehler dabei.\n"

    prompt.strip
  end

  # Generates the dev prompt for the AI
  def generate_dev_prompt(resource, compiled_source)
    prompt = "Nimm die Rolle eines Lehrers ein und hilf bei folgender Aufgabe. Das Ziel ist es am Ende einen fertigen Codeabschnitt zu haben, der die Aufgabe erfüllt.\n"
    
    generated_code = compiled_source
    prompt += "Das ist der aktuelle Code, den der User erstellt hat: \n#{generated_code}\n. Wenn dieser leer ist, dann hat der User noch nichts geschrieben und du solltest mit einem SELECT anfangen."
    available_tables = find_available_tables(resource.project)

    available_blocks = find_available_blocks(resource.block_language)

    if available_tables.length > 0
      prompt += "Hier sind alle Tabellen und Felder, die der User nutzen kann:\n"
      available_tables.each do |table|
        prompt += "- Tabelle: #{table[:name]}, Felder: #{table[:fields].join(', ')}\n"
      end
    end

    if available_blocks.length > 0
      prompt += "Hier sind alle verfügbaren Code-Blöcke, die der User nutzen kann:\n"
      available_blocks.each do |block|
        prompt += "- Kategorie: #{block[:category]}, Blöcke: #{block[:blocks].join(', ')}\n"
      end
    end
    # TODO: Prompt bzgl. komplexer Ausdrücke (und allg noch) verfeinern, insbesondere mit dem Binären Ausdruck bisher Schwierigkeiten
    prompt += <<~RULES
      Für deine Antworten gelten folgende Regeln:
      Antwort ohne Markdown, ohne Codefences, nur reines JSON mit den Feldern explanation (string) und next_block (string). Keine weiteren Texte.
      Bei Join Operationen wird der Code-Block INNER JOIN ON präferiert.
      Gib nur Hinweise für das weitere Vorgehen und keine kompletten Lösungen.
      Falls der User etwas falsches eingesetzt hat oder etwas, was zu viel für die eigentliche Aufgabe ist, weise darauf hin und sage, ihm, dass er den betroffenen Block entfernen sollte.
      Nenne nur Code-Blöcke, die zur Verfügung stehen. Tabellennamen oder Tabellenspalten zählen auch jeweils als ein Code-Block. 
      Komplexere Statements müssen auf den kleinsten Code-Block runtergebrochen werden. Beispiel: "Tabellenname.Tabellenspalte = FALSE" besteht aus drei Code-Blöcken: Hint 1: "Binärer Ausdruck", Hint 2: "Tabellenname.Tabellenspalte" und Hint 3: Konstante.
      Wichtig: Wenn komplexe Statements den Block "Binärer Ausdruck" beinhalten, nenne diesen zuerst. 
      Manche Blöcke ändern ihr Erscheinungsbild im zu vervollständigenden Code, wenn sie verwendet wurden:
        - "Binärer Ausdruck": Erscheint als "=" im Code, kann aber auch andere binäre Ausdrücke wie "<", "<=", "LIKE" usw annehmen
        - ":parameter": Erscheint als ":param" im Code
        - "Klammern": Erscheint als "()" im Code
        - "Konstante": Erscheint als "wert" im Code
      Nach dem Einsetzen einer Konstante gib dann als nächsten Hint, was für einen Wert die Konstante haben soll mit "Anstatt wert schreibst du nun …".
      Bei den Tabellenspalten sollte deine Antwort dem gängigen Schema "Tabellenname.Tabellenspalte" entsprechen.
      Es kann sein, dass der Code bereits vollständig ist. Evaluiere das vorher und teile es dem User mit, wenn der Code bereits vollständig ist.
      Wenn es noch weitere Möglichkeiten gäbe, der Code aber die Aufgabe im Grunde bereits erfüllt, dann teile das ebenfalls dem User mit, wie folgt:
      "Der Code erfüllt die Aufgabe bereits, du könntest ihn noch verändern, indem …"
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