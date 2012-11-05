var http = require("http");
var querystring = require("querystring");
var events = require("events");
var util = require("util");
var crypto = require("crypto");
var _ = require("underscore");
var timeunit = require("./timeunit");
var cache = require("./cache").newInstance();

exports.createRequest = function(url, content, platform, api, config) {
	return new Request(url, content, platform, api, config);
};

function Request(url, content, platform, api, config) {
	var self = this;
	self.id = generateId(content, platform, api);
	self.url = url;
	self.content = content;
	self.platform = platform;
	self.api = api;
	self.config = config;
	self.dataEmitted = false;
}

util.inherits(Request, events.EventEmitter);

Request.prototype.start = function() {
	var self = this;
	var payload = self.generatePayload();
	var options = self.generateOptions(payload);

	self.initiateRequest(payload, options, function(response) {
	  var reply = "";

	  response.setEncoding("UTF8");
	  response.on("data", function (chunk) 	{
	    reply += chunk;
	  });
	  response.on("end", function () {
	  	if (self.replyHasNoErrors(reply)) {
		  	var data = JSON.parse(reply);
	  		if (data.status === "error") {
		  		self.fetchFromCacheOrError(self.id, data.error);
		  	} else {
		  		// Store the data when the configuration has caching enabled
		  		if (self.config["caching"]) {
			  		cache.store(self.id, data);
		  		}
		  		// Cached data might have already been returned
		  		if (!self.dataEmitted) {
			  		self.emit("data", data);
			  	}
		  	}
		  }
	  });
	});
};

Request.prototype.generatePayload = function() {
	var self = this;
	return self.content === null ? "" :
				 		querystring.stringify(self.content);
};

Request.prototype.generateOptions = function(payload) {
	var self = this;
	return {
		method: "POST",
		host: self.url,
		path: "/" + self.platform + "/" + self.api + "/",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Content-Length" : payload.length
		}
	};
};

Request.prototype.initiateRequest = function(payload, options, callback) {
	var self = this;
	self.request = http.request(options, callback);

	// Set up the timeouts
	var nTimeout = 0;
	_.each(self.config["timeouts"], function(timeout) {
		  var time = timeunit.toMillis(timeout["timeout"]);
		  self.request.setMaxListeners(0);
		  self.request.setTimeout(time, function() {
				if (cache.contains(self.id, timeunit.toMillis(timeout["cache-item-max-age"]))) {
					self.emit("data", cache.fetch(self.id));
					self.dataEmitted = true;
				}
		  	// Cancel the request when this is the last timeout
		  	if (nTimeout === self.config["timeouts"].length - 1) {
			  	self.cancelRequest();
			  }
		  });
		  nTimeout++;
		});
	self.request.write(payload);
	self.request.end();

	self.attachErrorHandling();
};

Request.prototype.attachErrorHandling = function() {
	var self = this;
	self.request.on("error", function(err) {
		_.each(self.config["errors"], function(error) {
			if (error.code === err.code) {
				if (cache.contains(self.id, timeunit.toMillis(error["cache-item-max-age"]))) {
					self.emit("data", cache.get(self.id));
					return;
				}
			}
		});
		self.emit("error", err);
	});
}

// TODO This should use the cache item age in most cases...
Request.prototype.fetchFromCacheOrError = function(id, msg) {
	var self = this;
	if (self.config["caching"] && cache.contains(id)) {
		self.emit("data", cache.fetch(id));
		self.dataEmitted = true;
	} else {
	  self.emit("error", msg);
	}
};

Request.prototype.replyHasNoErrors = function(reply) {
	var self = this;
	_.each(self.config["invalid-replies"], function(invalidReply) {
		if(reply.indexOf(invalidReply["substring"]) >= 0) {
			self.fetchFromCacheOrError(self.id, invalidReply["message"]);
			return false;
		}
	});
	return true;
}

Request.prototype.cancelRequest = function() {
	var self = this;
	if (self.request !== null) {
		self.request.destroy();
	}
};

var generateId = function(content, platform, api) {
	var hash = crypto.createHash("sha1");
	return hash.update(JSON.stringify({
			content: content,
			platform: platform,
			api: api
		})).digest("hex");
};