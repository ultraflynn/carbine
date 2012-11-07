exports.config = {
   "caching": true, // Will the results of a successful API call be cached?
   // List of invalid replies. Successful HTTP request may contain errors
   "invalid-replies": [],
   // List of errors. Defines the data the can be returned in the event of an error
   "errors": [
      {
         "code": "ENOTFOUND",
         "cache-item-max-age": {
            "time": 1,
            "unit": "hour"
         }
      }
   ],
   // List of timeouts. The last timeout will always cancel the request
   "timeouts": [
      {
         "name": "fast-response", // simply describes why the timeout is being set
         // when this timeout will fire
         "timeout": {
            "time": 2, // how many units must pass since the last timeout before this timeout is triggered
            "unit": "second" // millisecond | second | minute | hour | day
         },
         // maximum age of the data that can be returned
         "cache-item-max-age": {
            "time": 20,
            "unit": "minute"
         }
      },
      {
         "name": "slow-response",
         "timeout": {
            "time": 10,
            "unit": "second"
         },
         "cache-item-max-age": {
            "time": 1,
            "unit": "hour"
         }
      },
      {
         "name": "platform-maximum",
         "timeout": {
            "time": 20,
            "unit": "second"
         }
         // cache-item-max-age not specified so any age data will do
      }
   ]
};
