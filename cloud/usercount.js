module.exports.increment = increment;
module.exports.count = count;

// Increments the UserCount.
// Returns: UserCount
function increment(response) {
    var UserCount = Parse.Object.extend("UserCount");
    var userCountQuery = new Parse.Query(UserCount);

    userCountQuery.first({
        success: function(userCount) {
            userCount.increment('count');
            userCount.save(null, {
                success: response.success,
                error: function(userCount,error) {
                    response.error(error);
                }
            });
        },
        error: function(userCount,error) {
            response.error(error);
        }
    });
}

// Gets the total number of users.
// Returns: int
function count(response) {
    var UserCount = Parse.Object.extend("UserCount");
    var query = new Parse.Query(UserCount);

    query.first({
        success: function(userCount) {
            response.success(userCount.get("count"));
        },
        error: response.error
    });
}
