// Augments app.json with dynamic values that can't be expressed statically.
// Currently we only override `android.googleServicesFile` so that EAS Build
// can supply the file via a secret file environment variable (named
// `GOOGLE_SERVICES_JSON`, type "file", visibility "secret"). When the env
// var is set (EAS Build), we use the path it points to. When it's unset
// (local development), we fall back to the gitignored local copy.
//
// Why we need this: `app.json` is parsed as static JSON, so `$VARNAME`-style
// substitutions don't get resolved there. EAS' guidance is to use
// `app.config.js`/`.ts` for any field that depends on env vars.

const path = require('path');

module.exports = ({ config }) => {
  const localPath = path.resolve(__dirname, 'google-services.json');
  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || localPath,
    },
  };
};
