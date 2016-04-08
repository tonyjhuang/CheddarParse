module.exports.get = get;
module.exports.getActiveForChatRoom = getActiveForChatRoom;
module.exports.deactive = deactivate;
module.exports.create = create;
module.exports.generateName = generateName;
module.exports.getActive = getActive;
module.exports.deactivate = deactivate;

var adjectives = require('cloud/adjectives.js');
var animals = require('cloud/animals.js');

function get(aliasId) {
    var query = new Parse.Query("Alias");
    return query.get(aliasId);
}

function getActiveForChatRoom(chatRoomId) {
    var query = new Parse.Query("Alias");
    query.equalTo("chatRoomId", chatRoomId);
    query.equalTo("active", true);
    return query.find();
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

// Generate new Alias name.
function generateName() {
    return adjectives.random() + " " + animals.random();
}

// Returns all active Aliases for a given ChatRoom.
function getActive(chatRoomId) {
    var query = new Parse.Query("Alias");
    query.equalTo("chatRoomId", chatRoomId);
    query.equalTo("active", true);
    return query.find();
}
