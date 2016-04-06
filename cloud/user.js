module.exports.get = get;
module.exports.create = create;

function get(userId, response) {
    var query = new Parse.Query(Parse.User);
    query.get(userId, response);
}

function create(username, response) {
    var user = new Parse.User();
    user.set('username', username);
    user.set('password', 'password');

    user.save(null, response);
}
