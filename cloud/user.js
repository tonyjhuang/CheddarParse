module.exports.get = get;
module.exports.create = create;
module.exports.updateEmailAddress = updateEmailAddress;

function get(userId) {
    var query = new Parse.Query(Parse.User);
    return query.get(userId);
}

function create(username) {
    var user = new Parse.User();
    user.set('username', username);
    user.set('password', 'password');

    return user.save(null);
}

function updateEmailAddress(userId, email) {
    return get(userId).then(function(user) {
        user.set("email", email);
        return user.save();
    });
}
