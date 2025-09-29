class Mutations::CodeResource::AiHint < Mutations::BaseMutation
  def self.default_graphql_name
    "CodeResourceAiHint"
  end

  argument :id, ID, required: true
  argument :compiled_source, String, required: true
  argument :last_dragged_block, String, required: false
  argument :clicked_hole_text, String, required: false

  field :answer_text, String, null: false
  field :next_block, String, null: false
  field :assignment_with_accentuation, String, null: false
  field :suggested_hole_text, String

  def resolve(id:, compiled_source:, last_dragged_block: nil, clicked_hole_text: nil)
    resource = CodeResource.find_by!(id: id)

    authorize resource.project, :ai_hint?

    prompt_dev = generate_dev_prompt(resource, compiled_source)
    prompt_user = generate_user_prompt(resource, compiled_source, last_dragged_block, clicked_hole_text)

    ai_hint = query_ai(prompt_dev, prompt_user)

    {
      answer_text: "#{ai_hint[:explanation]}\n", next_block: "#{ai_hint[:next_block]}", assignment_with_accentuation: "#{ai_hint[:assignment_with_accentuation]}", suggested_hole_text: "#{ai_hint[:suggested_hole_text]}"
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
        model: "gpt-4.1",
        messages: [{role: "developer",content: message_dev},{ role: "user", content: message_user}],
        temperature: 0.7,
      }
    )
    begin
      content= response.dig("choices", 0, "message", "content")
      clean = content.gsub(/```(?:json)?/, "").strip
      JSON.parse(content, symbolize_names: true) # => {:explanation=>"…", :next_block=>"…", :assignment_with_accentuation=>"…", :suggested_hole_text=>"…"}

    rescue JSON::ParserError => e
      Rails.logger.error("no valid json from ai: #{e.message}, content=#{content.inspect}")
      { explanation: "Konnte Hinweis nicht verarbeiten.", next_block: "" }
    end
  end


  # Generates a user prompt for the AI to help with the code resource.
  def generate_user_prompt(resource, compiled_source, last_dragged_block, clicked_hole_text)
    assignment = resource.assignment
   
    generated_code = compiled_source # Received from client, to make sure it is the current compiled code and not the last saved code

    prompt = "Meine Aufgabe (assignment) lautet: #{assignment}\n" if assignment.present?
    prompt += "Mein Code sieht aktuell so aus und ich möchte diesen vervollständigen:\n#{generated_code}\n"
    prompt += "Ich möchte als nächstes den Code-Block für das hole mit diesem Platzhalter wissen #{clicked_hole_text}\n" if clicked_hole_text

    # if I don't use this, ai gets stuck on Binärer Ausdruck
    prompt += "Dafür habe ich zuletzt den folgenden Code-Block verwendet: \"#{last_dragged_block}\" der Code sieht danach so aus: \n#{generated_code}\n" if last_dragged_block

    prompt.strip
  end

  # Generates the dev prompt for the AI
  def generate_dev_prompt(resource, compiled_source)
    assignment = resource.assignment
    prompt = "Nimm die Rolle eines Lehrers ein und hilf bei folgender Aufgabe (assignment): #{assignment}\n"
    
    generated_code = compiled_source
    print generated_code
    prompt += "Das ist der aktuelle Code, den der User erstellt hat und der die Grundlage deiner Antworten ist, er ändert sich nach jeder Aktion des Users: \n#{generated_code}\n. Wenn dieser leer ist, dann hat der User noch nichts geschrieben und du solltest mit einem FROM anfangen. Orientiere dich bei der Reihenfolge der Codeblöcke an der SQL Verarbeitungsreihenfolge."
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
    # TODO: refine prompt, especially regarding complex expressions (binary expression is a huge problem for ai) 
    # TODO: maybe prompting in english is the better way to go
    # TODO: ai doesn't understand suggested_holes and doesn't fill the JSON field 
    prompt += <<~RULES
      Für deine Antworten gelten folgende Regeln:
      Allgemein:
      - Antwort ohne Markdown, ohne Codefences, nur reines JSON mit den Feldern explanation (string), next_block (string), assignment_with_accentuation (string) und suggested_hole_text(string). Keine weiteren Texte.
      - Bei Join Operationen wird der Code-Block INNER JOIN ON präferiert.
      - Schaue dir nicht nur den zuletzt gezogenen Block an, der aktuelle Code ist wichtiger.
      - Wenn der User angibt, bei welchem hole er weitermachen möchte, dann mache dort weiter, auch wenn es anderen Vorgaben widerspricht. 
      - WICHTIG: Die COUNT()-Funktionen mit leeren Klammern sind bereits korrekt implementiert und sollen nicht kommentiert werden.

      Für explanation (string):
      - Gib nur Hinweise für das weitere Vorgehen und keine kompletten Lösungen. 
      - Falls der User etwas falsches eingesetzt hat oder etwas, was zu viel für die eigentliche Aufgabe ist, weise darauf hin und sage, ihm, dass er den betroffenen Block entfernen sollte.
      - Nenne nur Code-Blöcke, die zur Verfügung stehen. Tabellennamen oder Tabellenspalten zählen auch jeweils als ein Code-Block. 
      - Wichtig: Wenn komplexe Statements den Block "Binärer Ausdruck" beinhalten, nenne diesen zuerst. 
      - Nach dem Einsetzen einer Konstante gib dann als nächsten Hint, was für einen Wert die Konstante haben soll mit "Anstatt wert schreibst du nun …".
      - Bei den Tabellenspalten sollte deine Antwort dem gängigen Schema "Tabellenname.Tabellenspalte" entsprechen.

      Für suggested_hole_text(string):
      - Platzhalter im aktuellen Code nach dem Schema $x$ mit x als Zahl, repräsentieren Löcher im Code. Hier entnimmst du den Text für suggested_hole_text. Nur wenn es keine Löcher mehr gibt, also keine $x$ Ausdrücke, lasse das Feld im JSON leer, sonst gib es immer mit an.
      - Wenn der Code leer ist, also nur aus $0$ $1$ besteht, dann gibst du $1$ zurück.
      
      Für assignment_with_accentuation (string):
      - Wenn der Code die Aufgabe noch nicht erfüllt, hebe außerdem in dem gegebenen assignment hervor, auf welchen Teil der Aufgabenstellung sich deine Erklärung bezieht, indem du das übergebene assignment zurückgibst und den relevanten Teil bold machst. 
      - Verändere den Wortlaut des Assignments nicht und füge auch nichts hinzu.
      - Hier ein Beispiel mit Bezug zu dem Inhalt den du in next_block packst:
        - FROM:  Zeige die Namen aller ** Strecken **, die eine Kanone haben
        - Tabellenname:  Zeige die Namen aller ** Strecken **, die eine Kanone haben
        - SELECT: Zeige die ** Namen aller Strecken **, die eine Kanone haben
        - Tabellenname.Tabellenspalte (für das SELECT): Zeige die ** Namen aller Strecken **, die eine Kanone haben
        - WHERE: Zeige die Namen aller Strecken, ** die eine Kanone haben **
        - Binärer Ausdruck: Zeige die Namen aller Strecken, ** die eine Kanone haben **
        - Konstante: Zeige die Namen aller Strecken, ** die eine Kanone haben **
        - Tabellenname.Tabellenspalte (für den Binären Ausdruck): Zeige die Namen aller Strecken, ** die eine Kanone haben **
        
      Für next_block (string):
      - Nenne nur Code-Blöcke, die zur Verfügung stehen. Tabellennamen oder Tabellenspalten zählen auch jeweils als ein Code-Block. 
      - Komplexere Statements müssen auf den kleinsten Code-Block runtergebrochen werden. 
        - Beispiel: "Tabellenname.Tabellenspalte = FALSE" besteht aus drei Code-Blöcken: Hint 1: "Binärer Ausdruck", Hint 2: "Tabellenname.Tabellenspalte" und Hint 3: Konstante.
      - Wichtig: Wenn komplexe Statements den Block "Binärer Ausdruck" beinhalten, nenne diesen zuerst. 
      - Manche Blöcke ändern ihr Erscheinungsbild im zu vervollständigenden Code, wenn sie verwendet wurden:
        - "Binärer Ausdruck": Erscheint als "=" im Code, kann aber auch andere binäre Ausdrücke wie "<", "<=", "LIKE" usw annehmen. Auch wenn im aktuellen Code "Tabellenname.Tabellenspalte = $x$" (mit x als beliebige Zahl) steht, ist der Binäre Ausdruck bereits gesetzt.
        - ":parameter": Erscheint als ":param" im Code
        - "Klammern": Erscheint als "()" im Code
        - "Konstante": Erscheint als "wert" im Code
          - Nach dem Einsetzen einer Konstante gib dann als nächsten Hint, was für einen Wert die Konstante haben soll mit "Anstatt wert schreibst du nun …".
      - Bei den Tabellenspalten sollte deine Antwort dem gängigen Schema "Tabellenname.Tabellenspalte" entsprechen.
      
      Allgemein zu vollständigem Code:
      Es kann sein, dass der Code bereits vollständig ist. Evaluiere das vorher und handle dann gemäß diesen Punkten.
      Code ist vollständig, wenn
        - SELECT und FROM sind enthalten UND die Aufgabenstellung ist erfüllt
      Handlungspunkte:
      - Für explanation (string): teile es dem User mit, wenn der Code bereits vollständig ist. Wenn es noch weitere Möglichkeiten gäbe, der Code aber die Aufgabe im Grunde bereits erfüllt, dann teile das ebenfalls dem User mit, wie folgt: "Der Code erfüllt die Aufgabe bereits, du könntest ihn noch verändern, indem …"
      - Für next_block (string): übergebe einen leeren string.
      - Für assignment_with_accentuation (string): übergebe das Feld leer (null oder nil)
      Das Ziel ist es am Ende einen fertigen Codeabschnitt zu haben, der die Aufgabe erfüllt.\n    
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