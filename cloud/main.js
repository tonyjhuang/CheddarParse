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

Parse.Cloud.define("registerNewUser", function(request, response) {
    getUserCount(function(userCount) {
        var user = new Parse.User();
        user.set('password', 'password');
        user.set('username', (userCount + 1).toString());

        user.save(null, {
            success: response.success,
            error: function(user, error) {
                response.error(error);
            }
        });
    }, function(error) {
        response.error(error);
    });
});

// Increment our UserCount on new Parse Users.
Parse.Cloud.afterSave(Parse.User, function(request) { 
    if (request.object.existed()) {
        return;
    }

    Parse.Cloud.useMasterKey();
    incrementUserCount({
        success: function() {
            console.log("incremented UserCount");
        },
        error: function(error) {
            console.error(error);
        }
    });
});

function incrementUserCount(response) {
    var UserCount = Parse.Object.extend("UserCount");
    var userCountQuery = new Parse.Query(UserCount);

    userCountQuery.first({  
        success: function(userCount) {
            userCount.increment('count');
            userCount.save(null, {
                success: function(userCount) {
                    response.success();
                },
                error: function(userCount,error) {
                    response.error(error);
                }
            });
        },
        error: function(userCount,error) {
            response.error(error);
        }
    });
}

function getUserCount(successCallback, errorCallback) {
    var UserCount = Parse.Object.extend("UserCount");
    var userCountQuery = new Parse.Query(UserCount);

    userCountQuery.first({ 
        success: function(userCount) {
            successCallback(userCount.get("count"));
        },
        error: function(userCount,error) {
            errorCallback(error);
        }
    });
}

Parse.Cloud.define("sendMessage", function(request, response) {
    var requiredParams = ["pubkey", "subkey", "body", "aliasId"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var Alias = Parse.Object.extend("Alias");
    var query = new Parse.Query(Alias);
    query.get(params.aliasId, {
        success: function(alias) {
            var message = {
                "body": params.body,
                "alias": alias
            };

            pubnub.sendMessage(params.pubkey,
                               params.subkey,
                               alias.get("chatRoomId"),
                               message)
                .then(function(httpResponse) {
                    saveMessage(alias,
                                params.body,
                                response);
                }, response.error);

        },
        error: response.error
    });
});

function saveMessage(alias, body, response) {
    var Message = Parse.Object.extend("Message");
    var message = new Message();

    message.set("body", body);
    message.set("alias", alias);

    message.save(null, {
        success: response.success,
        error: function(message, error) {
            response.error(error);
        }
    });
}

// Takes: {userId: string, maxOccupancy: int}
// Returns: ChatRoom
Parse.Cloud.define("getNextAvailableChatRoom", function(request, response) {
    checkMissingParams(request.params, ["userId", "maxOccupancy"], response);
    getNextAvailableChatRoom(request.params.userId, request.params.maxOccupancy, response);
});

// Takes: {userId: string, maxOccupancy: int}
// Returns: Alias
Parse.Cloud.define("joinNextAvailableChatRoom", function(request, response) {
    checkMissingParams(request.params, ["userId", "maxOccupancy"], response);
    getNextAvailableChatRoom(request.params.userId, request.params.maxOccupancy, {
        success: function(chatRoom) {
            addToChatRoom(request.params.userId, chatRoom.id, getAliasName(), response);
        },
        error: response.error
    });
});

// Takes: {aliasId: string}
// Returns: Alias
Parse.Cloud.define("leaveChatRoom", function(request, response) {
    checkMissingParams(request.params, ["aliasId"], response);
    var aliasQuery = new Parse.Query("Alias");
    aliasQuery.get(request.params.aliasId, {
        success: function(alias) {
            alias.set("active", false);
            alias.save(null, {
                success: response.success,
                error: function(alias, error) {
                    response.error(error)
                }
            });
        },
        error: response.error
    });
});

// Generates a random nickname for the user.
function getAliasName() {
    return adjectives.random() + " " + animals.random();
}

// "Adds" a User to a ChatRoom by creating the proper Alias.
// Returns: Alias
function addToChatRoom(userId, chatRoomId, aliasName, response) {
    var Alias = Parse.Object.extend("Alias");
    var alias = new Alias();

    alias.set("name", aliasName);
    alias.set("active", true);
    alias.set("userId", userId);
    alias.set("chatRoomId", chatRoomId);
    
    alias.save(null, {
        success: response.success,
        error: function(alias, error) {
            response.error(error)
        }
    });
}

// After any Alias is updated, make sure the associated ChatRoom's
// numOccupants field reflects the number of active members..
Parse.Cloud.afterSave("Alias", function(request) {
    var chatRoomId = request.object.get("chatRoomId");
    var chatRoomQuery = new Parse.Query("ChatRoom");
    chatRoomQuery.get(chatRoomId, {
        success: function(chatRoom) {
            var aliasQuery = new Parse.Query("Alias");
            aliasQuery.equalTo("chatRoomId", chatRoomId);
            aliasQuery.equalTo("active", true);
            aliasQuery.count({
                success: function(activeAliasCount) {
                    chatRoom.set("numOccupants", activeAliasCount);
                    chatRoom.save();
                },
                error: console.error
            });
        },
        error: function(chatRoom, error) {
            console.error(error);
        }
    });
});

// Returns the next available ChatRoom for the given user. If there are
// no open ChatRooms then a new one will be created with the given
// |maxOccupancy|. Will not return empty ChatRooms.
function getNextAvailableChatRoom(userId, maxOccupancy, response) {
    var aliasQuery = new Parse.Query("Alias");
    aliasQuery.equalTo("userId", userId);

    var chatRoomQuery = new Parse.Query("ChatRoom");
    /*
    // Don't return ChatRooms that this User already has an Alias for.
    chatRoomQuery.doesNotMatchKeyInQuery("objectId", "chatRoomId", aliasQuery);
    chatRoomQuery.equalTo("maxOccupancy", maxOccupancy);
    chatRoomQuery.notEqualTo("numOccupants", 0);
    chatRoomQuery.ascending("numOccupants");
    */
    /////////// FOR BETA, JUST RETURN THE FIRST CHAT ROOM. THIS IS OUR BETA ROOM.
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
