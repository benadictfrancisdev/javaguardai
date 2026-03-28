const NodeCache = require('node-cache');
const config = require('../config/config');

const cache = new NodeCache({
  stdTTL: config.cache.ttl,
  checkperiod: 120,
  useClones: false,
});

const cacheService = {
  get(key) {
    return cache.get(key);
  },

  set(key, value, ttl) {
    return cache.set(key, value, ttl || config.cache.ttl);
  },

  del(key) {
    return cache.del(key);
  },

  flush() {
    return cache.flushAll();
  },

  getStats() {
    return cache.getStats();
  },

  generateKey(prefix, data) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    return `${prefix}:${hash}`;
  },
};

module.exports = cacheService;
