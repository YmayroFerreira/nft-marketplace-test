/** Shared Lighthouse CI settings: optimized build, default mock scenario, 3 runs, median. */
const PORT = 4174

module.exports = function createConfig(profile, settings) {
  return {
    ci: {
      collect: {
        startServerCommand: `node ./node_modules/vite/bin/vite.js preview --port ${PORT} --strictPort`,
        startServerReadyPattern: 'Local',
        url: [
          `http://localhost:${PORT}/`,
          `http://localhost:${PORT}/nft/emerald-ape-042`,
        ],
        numberOfRuns: 3,
        settings: {
          // Without a GPU, headless Chromium emulates one in software, which stalls
          // the first paint for up to seconds at random and hides the app's real cost
          chromeFlags: '--headless=new --no-sandbox --disable-gpu',
          ...settings,
        },
      },
      assert: {
        assertions: {
          'categories:performance': ['error', { minScore: 0.9, aggregationMethod: 'median' }],
          'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median' }],
          'categories:best-practices': ['error', { minScore: 0.95, aggregationMethod: 'median' }],
          'categories:seo': ['error', { minScore: 0.9, aggregationMethod: 'median' }],
        },
      },
      upload: { target: 'filesystem', outputDir: `lighthouse/reports/${profile}` },
    },
  }
}
