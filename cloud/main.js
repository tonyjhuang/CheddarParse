/*
curl -X POST \
 -H "X-Parse-Application-Id: ${APPLICATION_ID}" \
 -H "X-Parse-REST-API-Key: ${REST_API_KEY}" \
 -H "Content-Type: application/json" \
 -d '{}' \
 https://api.parse.com/1/functions/hello
*/

var adjectives = require('cloud/adjectives.js');
var animals = require('cloud/animals.js');

// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
    response.success(getAliasName());
});

// Takes: {userId: string, maxOccupancy: int}
Parse.Cloud.define("joinChatRoom", function(request, response) {
    checkMissingParams(request.params, ["userId", "maxOccupancy"], response);
    getNextAvailableChatRoom(request.params.userId, request.params.maxOccupancy, {
        success: function(chatRoom) {
            addToChatRoom(request.params.userId, chatRoom, getAliasName(), response);
        },
        error: response.error
    });
});

// Takes: {userId: string, maxOccupancy: int}
Parse.Cloud.define("getNextAvailableChatRoom", function(request, response) {
    checkMissingParams(request.params, ["userId", "maxOccupancy"], response);
    getNextAvailableChatRoom(request.params.userId, request.params.maxOccupancy, response);
});

// Generates a random nickname for the user.
function getAliasName() {
    return adjectives.random() + " " + animals.random();
}

// Note: Takes a ChatRoom object, not an ObjectId.
// Returns: {"alias": Alias, "chatRoom": ChatRoom}
function addToChatRoom(userId, chatRoom, aliasName, response) {
    var Alias = Parse.Object.extend("Alias");
    var alias = new Alias();

    alias.set("name", aliasName);
    alias.set("active", true);
    alias.set("userId", userId);
    alias.set("chatRoomId", chatRoom.id);
    
    alias.save(null, {
        success: function(alias) {
            chatRoom.increment("numOccupants");
            chatRoom.save(null, {
                success: function(chatRoom) {
                    response.success({"alias": alias, "chatRoom": chatRoom});
                },
                error: response.error
            });
        },
        error: response.error
    });
}

// Returns the next available ChatRoom for the given user. If there are
// no open ChatRooms then a new one will be created with the given
// |maxOccupancy|. Will not return empty ChatRooms.
function getNextAvailableChatRoom(userId, maxOccupancy, response) {
    var aliasQuery = new Parse.Query("Alias");
    aliasQuery.equalTo("userId", userId);

    var chatRoomQuery = new Parse.Query("ChatRoom");
    // Don't return ChatRooms that this User already has an Alias for.
    chatRoomQuery.doesNotMatchKeyInQuery("objectId", "chatRoomId", aliasQuery);
    chatRoomQuery.equalTo("maxOccupancy", maxOccupancy);
    chatRoomQuery.notEqualTo("numOccupants", 0);
    chatRoomQuery.ascending("numOccupants");
    
    chatRoomQuery.first({
        success: function(chatRoom) {
            if (chatRoom == undefined) {
                createChatRoom(maxOccupancy, response);
            } else {
            // Successfully retrieved the object.
                response.success(chatRoom);
            }
        },
        error: response.error
    });
}

function createChatRoom(maxOccupancy, response) {
    var ChatRoom = Parse.Object.extend("ChatRoom");
    var chatRoom = new ChatRoom();

    chatRoom.set("maxOccupancy", maxOccupancy);
    chatRoom.set("numOccupants", 0);

    chatRoom.save(null, {
        success: response.success,
        error: function(chatRoom, error) {
            response.error(error);
        }
    });
}

// Check for the existence of |keys| in |params|.
function checkMissingParams(params, keys, response) {
    var missingKeys = [];
    var i;
    for (i = 0; i < keys.length; ++i) {
        if (!(keys[i] in params)) {
            missingKeys.push(keys[i]);
        }
    }
    if (missingKeys.length > 0) {
        response.error("Missing params: " + missingKeys);
    }
}
