import { EnvironmentDescription } from "./environment.description";
import * as VERSION from "./version";

export const environment: EnvironmentDescription = {
  production: true,
  canonicalHost: "blattwerkzeug.de",
  apiEndpoint: "https://blattwerkzeug.de/api",
  loginEnabled: false,
  piwik: {
    host: "https://piwik.blattwerkzeug.de",
    id: 1,
    active: false,
  },
  sentry: {
    dsn: "https://e64499f04f2c44bb8167cfb43a1928b3@sentry.blattwerkzeug.de/2",
    active: false,
    showDialogue: true,
  },
  version: {
    hash: VERSION.GIT_REVISION,
    date: VERSION.BUILD_DATE,
  },
  availableLanguages: [
    { token: "de", name: "Deutsch" },
    { token: "en", name: "English" },
  ],
  debugLogging: {
    changeDetection: false,
    lifecycle: false,
  },
};
