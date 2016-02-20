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
var pubnub = require('cloud/pubnub.js');

// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
    response.success(getAliasName());
});

Parse.Cloud.define("sendMessage", function(request, response) {
    var requiredParams = ["userId", "chatRoomId", "pubkey", "subkey", "body"];
    checkMissingParams(request.params, requiredParams, response);
    var message = {"body": request.params.body, 
                   "userId": request.params.userId, 
                   "chatRoomId": request.params.chatRoomId};

    var params = request.params;
    pubnub.sendMessage(params.pubkey, params.subkey, params.chatRoomId,
                       message).then(function(httpResponse) {
                           saveMessage(request.params.userId,
                                       request.params.chatRoomId,
                                       request.params.body,
                                       response);
                       }, function(httpResponse) {
                           response.error(httpResponse);
                       });
});

Parse.Cloud.define("registerNewUser", function(request, response) {
    var user = new Parse.User();
    user.set('password', 'password');
    user.set('username', 'username');

    user.save(null, {
        success: function(user) {
            response.success(user);
        },
        error: function(message, error) {
            response.error(error);
        }
    });
});

function saveMessage(userId, chatRoomId, body, response) {
    var Message = Parse.Object.extend("Message");
    var message = new Message();

    message.set("userId", userId);
    message.set("chatRoomId", chatRoomId);
    message.set("body", body);

    message.save(null, {
        success: response.success,
        error: function(message, error) {
            response.error(error);
        }
    });
}

// Takes: {userId: string, maxOccupancy: int}
Parse.Cloud.define("joinChatRoom", function(request, response) {
    checkMissingParams(request.params, ["userId", "maxOccupancy"], response);
    getNextAvailableChatRoom(request.params.userId, request.params.maxOccupancy, {
        success: function(chatRoom) {
            addToChatRoom(request.params.userId, chatRoom.id, getAliasName(), response);
        },
        error: response.error
    });
});

// Takes: {userId: string, maxOccupancy: int}
Parse.Cloud.define("getNextAvailableChatRoom", function(request, response) {
    checkMissingParams(request.params, ["userId", "maxOccupancy"], response);
    getNextAvailableChatRoom(request.params.userId, request.params.maxOccupancy, response);
});

// Takes: {userId: string, chatRoomId: string}
// Returns: {alias: Alias}
Parse.Cloud.define("leaveChatRoom", function(request, response) {
    checkMissingParams(request.params, ["userId", "chatRoomId"], response);
    var aliasQuery = new Parse.Query("Alias");
    aliasQuery.equalTo("userId", request.params.userId);
    aliasQuery.equalTo("chatRoomId", request.params.chatRoomId);
    aliasQuery.first({
        success: function(alias) {
            alias.set("active", false);
            alias.save(null, {
               success: function(alias) {
                   decrementChatRoomOccupants(request.params.chatRoomId, {
                       success: function(chatRoom) {
                           response.success({"alias": alias, "chatRoom": chatRoom});
                       },
                       error: response.error
                   });
               }, 
               error: response.error
            });
        },
        error: response.error
    });
});

function decrementChatRoomOccupants(chatRoomId, response) {
    var ChatRoom = Parse.Object.extend("ChatRoom");
    var query = new Parse.Query(ChatRoom);
    query.equalTo("objectId", chatRoomId);
    query.first({
        success: function(chatRoom) {
           chatRoom.increment("numOccupants", -1);
           chatRoom.save(null, response);
        },
        error: response.error
   });
}

function incrementChatRoomOccupants(chatRoomId, response) {
    var ChatRoom = Parse.Object.extend("ChatRoom");
    var query = new Parse.Query(ChatRoom);
    query.equalTo("objectId", chatRoomId);
    query.first({
        success: function(chatRoom) {
           chatRoom.increment("numOccupants");
           chatRoom.save(null, response);
        },
        error: response.error
   });
}

// Generates a random nickname for the user.
function getAliasName() {
    return adjectives.random() + " " + animals.random();
}

// Note: Takes a ChatRoom object, not an ObjectId.
// Returns: {"alias": Alias, "chatRoom": ChatRoom}
function addToChatRoom(userId, chatRoomId, aliasName, response) {
    var Alias = Parse.Object.extend("Alias");
    var alias = new Alias();

    alias.set("name", aliasName);
    alias.set("active", true);
    alias.set("userId", userId);
    alias.set("chatRoomId", chatRoomId);
    
    alias.save(null, {
        success: function(alias) {
            incrementChatRoomOccupants(chatRoomId, {
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
