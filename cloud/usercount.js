module.exports.increment = increment;
module.exports.count = count;

// Increments the UserCount.
// Returns: UserCount
function increment() {
    var UserCount = Parse.Object.extend("UserCount");
    var query = new Parse.Query(UserCount);

    return query.first().then(function(userCount) {
        userCount.increment('count');
        return userCount.save(null);
    });
}

// Gets the total number of users.
// Returns: int
function count() {
    var UserCount = Parse.Object.extend("UserCount");
    var query = new Parse.Query(UserCount);

   return query.first().then(function(userCount) {
        return Parse.Promise.as(userCount.get("count"));
    });
}
