'use strict';
const {extractCrunchyroll} = require('./adapter.js');
extractCrunchyroll().then(data => {
  console.log(JSON.stringify(data, null, 2));
}).catch(error => {
  console.error('Parallel metadata extraction not completed:', error.message);
  process.exitCode = 1;
});
