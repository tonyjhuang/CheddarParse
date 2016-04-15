module.exports.get = get;
module.exports.getActiveForChatRoom = getActiveForChatRoom;
module.exports.deactive = deactivate;
module.exports.create = create;
module.exports.generateName = generateName;
module.exports.getActiveForChatRoom = getActiveForChatRoom;
module.exports.getActiveForUser = getActiveForUser;
module.exports.deactivate = deactivate;

var adjectives = require('cloud/adjectives.js');
var animals = require('cloud/animals.js');

function get(aliasId) {
    var query = new Parse.Query("Alias");
    return query.get(aliasId);
}

function deactivate(aliasId) {
    return get(aliasId).then(function(alias) {
        alias.set("active", false);
        alias.set("leftAt",new Date());
        return alias.save(null);
    });
}

// Creates and returns a new active Alias.
function create(userId, chatRoomId) {
    var Alias = Parse.Object.extend("Alias");
    var alias = new Alias();

    alias.set("name", generateName());
    alias.set("active", true);
    alias.set("userId", userId);
    alias.set("chatRoomId", chatRoomId);

    return alias.save(null);
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

// Generate new Alias name.
function generateName() {
    return adjectives.random().capitalize() + " " +
        animals.random().capitalize();
}

// Returns all active Aliases for a given ChatRoom.
function getActiveForChatRoom(chatRoomId) {
    var query = new Parse.Query("Alias");
    query.equalTo("chatRoomId", chatRoomId);
    query.equalTo("active", true);
    return query.find();
}

 // Returns all active Aliases for a given User.
function getActiveForUser(userId) {
    var query = new Parse.Query("Alias");
    query.equalTo("active", true);
    query.equalTo("userId", userId);
    return query.find();
}
