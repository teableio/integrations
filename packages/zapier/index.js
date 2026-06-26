// Zapier's wrapper loads `index.js` from the app root (it ignores package.json
// "main"). The real, TypeScript-compiled app lives in dist/, so re-export it.
module.exports = require('./dist/index.js');
