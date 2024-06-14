const path = require("path")

module.exports = (fastify) => {
    fastify.register(require(path.join(__dirname, 'api/' + "auth.js")), { prefix: 'api//' + "auth" });
    fastify.register(require(path.join(__dirname, 'api/' + "avatar.js")), { prefix: 'api' });
    fastify.register(require(path.join(__dirname, 'api/' + "general.js")), { prefix: 'api' });
}