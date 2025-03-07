export interface EnvironmentDescription {
  production: boolean;
  // Host-part of the URL where the project is available
  canonicalHost: string;
  // API endpoint for server-side API requests. The browser will
  // ignore this and use a relative URL instead.
  apiEndpoint: string;
  // Find out which part of the app are actually used
  // with Matomo
  piwik: {
    host: string;
    id: number;
    active: boolean;
  };
  loginEnabled: boolean;
  // Tracking bugs in the live environment with Sentry
  sentry: {
    dsn: string;
    active: boolean;
    showDialogue: boolean;
  };
  // Build information
  version: {
    hash: string;
    date: string;
  };

  /**
   * Languages that are available for the client and (possibly) also
   * for the database.
   *
   * The order this languages appear in defines the order in which lookups
   * are made for missing languages. So if a multi lingual string has values
   * for "de" and "en" but the current language is "fr", the value that
   * comes first in this configuration should be displayed, possibly
   * alongside a little warning.
   */
  availableLanguages: {
    token: string;
    name: string;
  }[];

  // Turning on and off some debug utilities
  debugLogging: {
    changeDetection: boolean;
    lifecycle: boolean;
  };
}
