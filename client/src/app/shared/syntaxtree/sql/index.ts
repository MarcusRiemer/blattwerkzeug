import { LanguageDefinition } from "../language";

import { NODE_CONVERTER } from "./sql.codegenerator";
import { SqlValidator } from "./sql.validator";

export const LANGUAGE_DESCRIPTION: LanguageDefinition = {
  id: "sql",
  name: "SQL",
  emitters: [],
  validators: [SqlValidator],
};
