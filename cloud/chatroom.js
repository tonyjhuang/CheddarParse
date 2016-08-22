module.exports.get = get;
module.exports.getNextAvailableChatRoom = getNextAvailableChatRoom;
module.exports.getAvailableColorId = getAvailableColorId;
module.exports.setName = setName;

function get(chatRoomId) {
    var query = new Parse.Query("ChatRoom");
    return query.get(chatRoomId);
}

// Gets the environment that maps to the given registration
// code. If there are no explicit environments, then the
// default environment == registrationCode
function getEnvForRegCode(registrationCode) {
    // Add custom environment mapping here.
    var envMap = {}
    return envMap[registrationCode] || registrationCode;
}

// Retrieves the next available ChatRoom for the user with the
// given id. Creates a new ChatRoom if none exist.
function getNextAvailableChatRoom(user, maxOccupancy) {
    var aliasQuery = new Parse.Query("Alias");
    aliasQuery.equalTo("userId", user.id);

    var query = new Parse.Query("ChatRoom");
    var env = getEnvForRegCode(user.get("registrationCode"));

    // Don't return ChatRooms that this User already has an Alias for.
    query.doesNotMatchKeyInQuery("objectId", "chatRoomId", aliasQuery);
    query.equalTo("maxOccupancy", maxOccupancy);
    query.notEqualTo("numOccupants", 0);
    query.lessThan("numOccupants", maxOccupancy);
    query.ascending("numOccupants");
    query.equalTo("env", env);

    return query.first().then(function(chatRoom) {
        if (chatRoom == undefined) {
            return createChatRoom(maxOccupancy, env);
        } else {
            return Parse.Promise.as(chatRoom);
        }
    });
}

// Creates and returns a new ChatRoom.
function createChatRoom(maxOccupancy, env) {
    var ChatRoom = Parse.Object.extend("ChatRoom");
    var chatRoom = new ChatRoom();

    chatRoom.set("maxOccupancy", maxOccupancy);
    chatRoom.set("numOccupants", 0);
    chatRoom.set("env", env);
    chatRoom.set("name", "Group Message");

    return chatRoom.save();
}

// Sets the name of a ChatRoom, returns the updated ChatRoom.
function setName(chatRoomId, name) {
    return get(chatRoomId).then(function(chatRoom) {
        chatRoom.set("name", name);
        return chatRoom.save();
    });
}

function getAvailableColorId(chatRoom) {
    var aliasQuery = new Parse.Query("Alias");
    aliasQuery.equalTo("chatRoomId", chatRoom.id);
    aliasQuery.equalTo("active", true);
    aliasQuery.ascending("colorId");

    return aliasQuery.find().then(function(aliases) {
        var i = 0;

        do {
            if (i == aliases.length) {
                return Parse.Promise.as(i);
            }

            var colorId = aliases[i].get("colorId");
            if (colorId != i) {
              return Parse.Promise.as(i);
            }
            i++;
        } while(i < chatRoom.get("maxOccupancy"));

        // All colorIds have been assigned.
        return Parse.Promise.as(-1);
    });
}
