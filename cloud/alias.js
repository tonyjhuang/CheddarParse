module.exports.get = get;
module.exports.deactive = deactivate;
module.exports.create = create;
module.exports.generateName = generateName;
module.exports.getActive = getActive;
module.exports.deactivate = deactivate;

var adjectives = require('cloud/adjectives.js');
var animals = require('cloud/animals.js');

function get(aliasId, response) {
    var query = new Parse.Query("Alias");
    query.get(aliasId, response);
}

function deactivate(aliasId, response) {
    get(aliasId, {
        success: function(alias) {
            alias.set("active", false);
            alias.set("leftAt",new Date());
            alias.save(null, response);
        }, error: response.error
    });
}

// Creates and returns a new active Alias.
function create(userId, chatRoomId, response) {
    var Alias = Parse.Object.extend("Alias");
    var alias = new Alias();

    alias.set("name", generateName());
    alias.set("active", true);
    alias.set("userId", userId);
    alias.set("chatRoomId", chatRoomId);

    alias.save(null, response);
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

// Generate new Alias name.
function generateName() {
    return adjectives.random().capitalize() + " " + animals.random().capitalize();
}

// Returns all active Aliases for a given ChatRoom.
function getActive(chatRoomId, response) {
    var query = new Parse.Query("Alias");
    query.equalTo("chatRoomId", chatRoomId);
    query.equalTo("active", true);
    query.find(response);
}
