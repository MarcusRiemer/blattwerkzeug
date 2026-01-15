import { URL } from "url";

import { httpRequest } from "./request-promise";

import { SyntaxTree } from "../app/shared/syntaxtree/syntaxtree";
import * as MetaBlockLanguage from "../app/shared/syntaxtree/meta-blocklanguage/meta-blocklanguage";

import { ServerApi } from "../app/shared/serverdata/serverapi";

import { AvailableLanguages, Language } from "../app/shared/syntaxtree/";
import {
  graphvizSyntaxTree,
  prettyPrintGrammar,
} from "../app/shared/syntaxtree/prettyprint";
import { referencedResourceIds } from "../app/shared/syntaxtree/syntaxtree-util";
import { NodeDescription } from "../app/shared/syntaxtree/syntaxtree.description";
import { GrammarDescription } from "../app/shared/syntaxtree/grammar.description";

import {
  BlockLanguageDescription,
  BlockLanguageListDescription,
} from "../app/shared/block/block-language.description";
import { prettyPrintBlockLanguage } from "../app/shared/block/prettyprint";
import { BlockLanguageGeneratorDocument } from "../app/shared/block/generator/generator.description";
import { generateBlockLanguage } from "../app/shared/block/generator/generator";
import { BlattWerkzeugError } from "../app/shared/blattwerkzeug-error";

/**
 * Can be used to test whether the IDE-service is actually available.
 */
interface PingCommand {
  type: "ping";
}

/**
 * Prints the grammar for a specific language.
 */
interface PrintGrammarCommand {
  type: "printGrammar";
  programmingLanguageId: string;
}

/**
 * Prints the block language definition for a certain language
 */
interface PrintBlockLanguageCommand {
  type: "printBlockLanguage";
  blockLanguageId: string;
}

/**
 * Prints the Graphviz representation of the given model.
 */
interface GraphvizSyntaxTreeCommand {
  type: "graphvizTree";
  model: NodeDescription;
}

/**
 * Prints the compiled version of the given syntaxtree.
 */
interface EmitCodeCommand {
  type: "emitCode";
  ast: NodeDescription;
  languageId: string;
  grammarId?: string;
}

/**
 * Generates blocks from the given instructions
 */
interface EmitGeneratedBlocksCommand {
  type: "emitGeneratedBlocks";
  blockLanguage: BlockLanguageListDescription;
  generator: BlockLanguageGeneratorDocument;
  grammar: GrammarDescription;
}

/**
 * Generates the block language settings from the given instructions
 */
interface EmitBlockLanguageSettingsCommand {
  type: "emitBlockLanguageSettings";
  metaBlockLanguage: NodeDescription;
}

/**
 * A list of all available programming languages.
 */
interface AvailableProgrammingLanguagesCommand {
  type: "available";
}

/**
 * All code resources that are referenced
 */
interface ReferencedCodeResourcesCommand {
  type: "referencedCodeResources" | "referencedGrammars";
  ast: NodeDescription;
  grammar: GrammarDescription;
}

type Command =
  | PingCommand
  | PrintGrammarCommand
  | PrintBlockLanguageCommand
  | AvailableProgrammingLanguagesCommand
  | GraphvizSyntaxTreeCommand
  | EmitCodeCommand
  | EmitGeneratedBlocksCommand
  | ReferencedCodeResourcesCommand
  | EmitBlockLanguageSettingsCommand;

// Knows all URLs that are available to the API
const serverApi = new ServerApi("http://localhost:9292/api");

/**
 * Retrieves a single grammar by name
 */
async function findGrammar(slug: string) {
  const url = new URL(serverApi.individualGrammarUrl(slug));
  return httpRequest<GrammarDescription>(url, "GET");
}

/**
 * Retrieves a single Language by its name
 */
async function findLanguage(
  languageId: string,
  grammarId: string | null
): Promise<Language> {
  if (grammarId) {
    const liveGrammar = await findGrammar(grammarId);
    if (liveGrammar) {
      return new Language(
        {
          id: languageId,
          name: liveGrammar.name,
          validators: [],
          emitters: [],
        },
        liveGrammar
      );
    } else {
      throw new Error(`Unknown grammar ${grammarId}`);
    }
  } else {
    const builtinLanguage = Object.values(AvailableLanguages).find(
      (l) => l.programmingLanguageId == languageId
    );
    if (builtinLanguage) {
      return builtinLanguage;
    } else {
      throw new Error(`Unknown builtin language ${languageId}`);
    }
  }
}

/**
 * Retrieves a single language model by name.
 */
async function findBlockLanguage(slug: string) {
  const url = new URL(serverApi.individualBlockLanguageUrl(slug));
  return httpRequest<BlockLanguageDescription>(url, "GET");
}

class BufferedStdoutError {
  constructor(public buffer: any[], public error: Error) {}
}

/**
 * Executes the given function with a swapped out console.log object. If nothing
 * goes wrong the buffered output is discarded, if something goes wrong it
 * is made part of the thrown exception.
 */
export async function saveLogOutput(f: () => Promise<Object | string>) {
  const oldRef = console.log;
  const buffer = [];

  try {
    console.log = function () {
      buffer.push(arguments);
    };
    return await f();
  } catch (exception) {
    throw new BufferedStdoutError(buffer, exception);
  } finally {
    console.log = oldRef;
  }
}

/**
 * Executes the given command
 */
export async function executeCommand(
  command: Command
): Promise<Object | string> {
  const result = saveLogOutput(async () => {
    switch (command.type) {
      case "ping":
        return "pong";
      case "printGrammar":
        const g = await findGrammar(command.programmingLanguageId);
        return prettyPrintGrammar(command.programmingLanguageId, g);
      case "printBlockLanguage": {
        const l = await findBlockLanguage(command.blockLanguageId);
        return prettyPrintBlockLanguage(l);
      }
      case "graphvizTree":
        return graphvizSyntaxTree(command.model);
      case "emitCode": {
        if (command.languageId !== "generic") {
          try {
            const l = await findLanguage(command.languageId, command.grammarId);
            const t = new SyntaxTree(command.ast);
            return l.emitTree(t);
          } catch (e) {
            if (e instanceof BlattWerkzeugError) {
              return "Error: " + e.message;
            } else {
              throw e;
            }
          }
        } else {
          return "Generic Language without code generator";
        }
      }
      case "emitGeneratedBlocks": {
        return generateBlockLanguage(command.generator, command.grammar);
      }
      case "emitBlockLanguageSettings": {
        return MetaBlockLanguage.readFromNode(command.metaBlockLanguage, true);
      }
      case "referencedCodeResources":
      case "referencedGrammars": {
        const searched =
          command.type === "referencedCodeResources"
            ? "codeResourceReference"
            : "grammarReference";
        return referencedResourceIds(command.ast, command.grammar, searched);
      }
    }
  });

  return result;
}

// Each given line is expected to be a self contained JSON object.
export function handleLine(line: string) {
  try {
    const command = JSON.parse(line) as Command;
    let result = executeCommand(command);

    // Did we get something meaningful back?
    if (result !== undefined) {
      Promise.resolve(result)
        .then((res) => {
          console.log(JSON.stringify(res));
        })
        .catch((err: unknown | BufferedStdoutError) => {
          console.error(`Error during operation "${command.type}"`);
          if (err instanceof BufferedStdoutError) {
            console.error(
              `Log output of failed operation: `,
              JSON.stringify(err.buffer)
            );
          }
          console.error(err);
        });
    } else {
      console.error("Unknown operation");
    }
  } catch (e) {
    console.error("Invalid command");
    console.error(e);
  }
}
