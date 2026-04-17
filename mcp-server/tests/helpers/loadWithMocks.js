const Module = require('module');

function loadWithMocks(modulePath, mocks = {}) {
  const originalLoad = Module._load;
  delete require.cache[require.resolve(modulePath)];

  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
}

module.exports = {
  loadWithMocks
};
