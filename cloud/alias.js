module.exports.get = get;
module.exports.getActiveForChatRoom = getActiveForChatRoom;
module.exports.deactive = deactivate;
module.exports.create = create;
module.exports.generateName = generateName;
module.exports.getActive = getActive;
module.exports.deactivate = deactivate;

const adjectives = require('../cloud/adjectives.js'),
    animals = require('../cloud/animals.js'),
    query = new Parse.Query("Alias");

function get(aliasId) {
    return query.get(aliasId);
}

function getActiveForChatRoom(chatRoomId) {
    query.equalTo("chatRoomId", chatRoomId);
    query.equalTo("active", true);
    return query.find();
}

function deactivate(aliasId) {
    return get(aliasId).then((alias) => {
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
    return adjectives.random().capitalize() + " " + animals.random().capitalize();
}

// Returns all active Aliases for a given ChatRoom.
function getActive(chatRoomId) {
    query.equalTo("chatRoomId", chatRoomId);
    query.equalTo("active", true);
    return query.find();
}
