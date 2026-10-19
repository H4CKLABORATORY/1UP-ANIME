/** @type {import('puppeteer').Configuration} */
module.exports={
 // Existing Playwright workflows also execute npm install. Avoid silently
 // downloading ~500MB of Chrome binaries during unrelated CI jobs.
 // ONEUP Puppeteer Browser QA installs its compatible headless shell explicitly.
 chrome:{skipDownload:true},
 'chrome-headless-shell':{skipDownload:true}
};
