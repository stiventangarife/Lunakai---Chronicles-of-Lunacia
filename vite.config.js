const path = require('path');

module.exports = {
  // Resolve 'three' to the local vendor file (not npm)
  resolve: {
    alias: {
      'three': path.resolve(__dirname, 'vendor/three.module.js')
    }
  },
  server: {
    port: 8081,
    host: true
  }
};
