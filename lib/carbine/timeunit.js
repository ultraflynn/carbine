// Provides time conversion functions

var timeunit = new TimeUnit();

var conversions = {
	"millisecond": function(time) {
		return time;
	},
	"second": function(time) {
		return time * 1000;
	},
	"minute": function(time) {
		return time * 60000; // 60 * 1000;
	},
	"hour": function(time) {
		return time * 3600000; // 60 * 60 * 1000;
	},
	"day": function(time) {
		return time * 86400000; // 24 * 60 * 60 * 1000;
	}
};


function TimeUnit() {
}

TimeUnit.prototype.toMillis = function(age) {
	if (conversions.hasOwnProperty(age["unit"])) {
		return conversions[age["unit"]](age["time"]);
	} else {
		throw new Error("Invalid unit '" + age["unit"] + "'.");
	}
}

exports.toMillis = timeunit.toMillis;
