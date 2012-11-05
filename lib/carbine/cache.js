exports.newInstance = function() {
	return new Cache();
};

function Cache() {
	var self = this;
	self.datastore = {};
}

Cache.prototype.store = function(id, data) {
	var self = this;
	// TODO Wrap the data with it's age
	self.datastore[id] = data;
	console.log("store - " + id);
};

Cache.prototype.contains = function(id, age) {
	var self = this;
	// TODO If the age is specified then check the age of the stored data
	return self.datastore.hasOwnProperty(id);
};

Cache.prototype.fetch = function(id) {
	var self = this;
	if (self.datastore.hasOwnProperty(id)) {
		console.log("fetch - " + id);
		return self.datastore[id];
	} else {
		return undefined;
	}
};

Cache.prototype.dumpToConsole = function() {
	var self = this;
	console.log(JSON.Stringify(self.datastore, null, 2));
};