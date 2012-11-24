var http = require("http");
var events = require("events");
var util = require("util");
var crypto = require("crypto");
var _ = require("underscore");
var timeunit = require("./timeunit");
var cache = require("./cache").newInstance();

exports.createRequest = function(url, payload, path, config) {
	return new Request(url, payload, path, config);
};

function Request(url, payload, path, config) {
	var self = this;
	self.id = generateId(payload, path);
	self.url = url;
	self.payload = payload;
	self.path = path;
	self.config = config;
	self.dataEmitted = false;
}

util.inherits(Request, events.EventEmitter);

Request.prototype.start = function() {
	var self = this;
	var options = self.generateOptions(self.payload);

	self.initiateRequest(self.payload, options, function(response) {
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

Request.prototype.generateOptions = function(payload) {
	var self = this;
	return {
		method: "POST",
		host: self.url,
		path: self.path,
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Content-Length" : payload.length
		}
	};
};

Request.prototype.initiateRequest = function(payload, options, callback) {
	var self = this;
	self.request = http.request(options, callback);

	self.attachTimeouts();
	self.attachErrorHandling();

	self.request.write(payload);
	self.request.end();
};

Request.prototype.attachTimeouts = function() {
	var self = this;

	if (self.config["timeouts"].length > 0) {
		var isFirst = true, previous = null;

		// Set up the timeouts
		_.each(self.config["timeouts"], function(timeout) {
			timeout["callback"] = function() {
				if (cache.contains(self.id, timeunit.toMillis(timeout["cache-item-max-age"]))) {
					self.emit("data", cache.fetch(self.id));
				} else {
					if (timeout.hasOwnProperty("next")) {
						var next = timeout["next"];
					  self.request.setTimeout(timeunit.toMillis(next["timeout"]), next.callback);
					} else {
				  	self.cancelRequest();
					}
				}
			};

			if (!isFirst) {
				previous["next"] = timeout;
			}

			previous = timeout;
			isFirst = false;
		});

		var first = self.config["timeouts"][0];
	  self.request.setTimeout(timeunit.toMillis(first["timeout"]), first.callback);
	}
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

var generateId = function(payload, path) {
	var hash = crypto.createHash("sha1");
	return hash.update(JSON.stringify({
			payload: payload,
			path: path
		})).digest("hex");
};