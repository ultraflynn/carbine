var request = require("./carbine/request");

exports.createRequest = request.createRequest;

exports.config = function(name) {
	return require("./carbine/config/" + name).config;
}