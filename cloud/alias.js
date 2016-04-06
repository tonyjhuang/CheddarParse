module.exports.get = get;
module.exports.getQuery = getQuery;
module.exports.deactive = deactivate;
module.exports.create = create;
module.exports.generateName = generateName;

function get(aliasId, response) {
    var query = new Parse.Query("Alias");
    query.get(aliasId, response);
}

// optional params: objectId, chatRoomId, active
function getQuery(aliasId, options) {
    var query = new Parse.Query("Alias");

    if('objectId' in options)
        query.equalTo('objectId', options.objectId);

    if('chatRoomId' in options)
        query.equalTo('chatRoomId', options.chatRoomId);

    if('active' in options)
        query.equalTo('active', options.active);

    return query;
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

// Generate new Alias name.
function generateName() {
    return adjectives.random() + " " + animals.random();
}

// Returns all active Aliases for a given ChatRoom.
function getActive(chatRoomId, response) {
    var query = new Parse.Query("Alias");
    query.equalTo("chatRoomId", chatRoomId);
    query.equalTo("active", true);
    query.find(response);
}
