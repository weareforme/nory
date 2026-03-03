module.exports = {
  proxy: "https://nory-dev.webflow.io",
  files: ["background-video.js"],
  serveStatic: ["."],
  rewriteRules: [
    {
      match: /https:\/\/cdn\.jsdelivr\.net\/gh\/weareforme\/nory@main\/background-video\.min\.js/g,
      replace: "/background-video.js"
    }
  ]
};