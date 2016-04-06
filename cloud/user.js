module.exports.create = create;

function create(username, response) {
    var user = new Parse.User();
    user.set('username', username);
    user.set('password', 'password');

    user.save(null, response);
}
