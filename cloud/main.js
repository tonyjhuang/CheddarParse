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
var Alias = require('cloud/alias.js');
var ChatRoom = require('cloud/chatroom.js');
var Message = require('cloud/message.js');
var Pubnub = require('cloud/pubnub.js');
var UserCount = require('cloud/usercount.js');

// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
    response.success(Alias.generateName());
});



// Replays events in a channel for an alias
// Optional params: startTimeToken, endTimeToken
// Response Payload:
// {"events":[{event}, {event}],
//   "startTimeToken": "00000",
//   "endTimeToken": "00000"}
Parse.Cloud.define("replayEvents", function(request, response) {
    var requiredParams = ["count", "aliasId", "subkey"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var count = params.count;
    var aliasId = params.aliasId;
    var subkey = params.subkey;

    replayEvents(count, aliasId, subkey, response);
});

function replayEvents(count, aliasId, subkey, response) {
    Alias.get(params.aliasId, {
        success: function(alias) {
            var chatRoomId = alias.get("chatRoomId");
            var startTimeToken = params.startTimeToken;
            var endTimeToken = params.endTimeToken
                ? params.endTimeToken
                : alias.get("createdAt").getTime() * 10000;
            var count = params.count;

            if (!startTimeToken) {
                startTimeToken = new Date().getTime() * 10000; // Start token should be now if no token was used for message replay
            }

            Pubnub.replayChannel(subkey, chatRoomId, startTimeToken, endTimeToken, count, response);
        },
        error: response.error
    });
}


// Creates a new User object.
Parse.Cloud.define("registerNewUser", function(request, response) {
    UserCount.count({
        success: function(userCount) {
            User.create(userCount.toString(), {
                success: response.success,
                error: function(user, error) {
                    response.error(error);
                }
            });
        },
        error: function(userCount, error) {
            response.error(error)
        }
    });
});

Parse.Cloud.define("findAlias", function(request, response) {
    var requiredParams = ["aliasId"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);
    Alias.get(params.aliasId, response);
});


// Increment our UserCount on new Parse Users.
Parse.Cloud.afterSave(Parse.User, function(request) {
    if (request.object.existed()) {
        return;
    }

    Parse.Cloud.useMasterKey();
    UserCount.increment({
        success: function(userCount) {
            console.log("incremented UserCount");
        },
        error: console.error
    });
});


function getUserCount(successCallback, errorCallback) {

}

// Sends a message through pubnub, persists it through parse.
// Takes: {body: string, aliasId: string, pubkey: string, subkey: string}
// Returns: Message
Parse.Cloud.define("sendMessage", function(request, response) {
    var requiredParams = ["pubkey", "subkey", "body", "aliasId"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var body = params.body;
    var aliasId = params.aliasId;
    var pubkey = params.pubkey;
    var subkey = params.subkey;

    Alias.get(aliasId, {
        success: function(alias) {
            Message.create(alias, body, {
                success: function(message) {
                    Pubnub.sendMessage(pubkey,
                                       subkey,
                                       alias.get("chatRoomId"),
                                       message,
                                       response);
                },
                error: response.error
            });
        },
        error: response.error
    });
});


// Takes: {userId: string, maxOccupancy: int}
// Returns: ChatRoom
Parse.Cloud.define("getNextAvailableChatRoom", function(request, response) {
    var requiredParams = ["userId", "maxOccupancy"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var userId = params.userId;
    var maxOccupancy = params.maxOccupancy;

    ChatRoom.getNextAvailableChatRoom(userId, maxOccupancy, response);
});


// Adds a User to a ChatRoom by creating a new active Alias and
// fires a pubnub presence event.
// Takes: {userId: string, maxOccupancy: int, subkey: string, pubkey: string}
// Returns: Alias
Parse.Cloud.define("joinNextAvailableChatRoom", function(request, response) {
    var requiredParams = ["userId", "maxOccupancy", "pubkey", "subkey"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var userId = params.userId;
    var maxOccupancy = params.maxOccupancy;
    var pubkey = params.pubkey;
    var subkey = params.subkey;

    ChatRoom.getNextAvailableChatRoom(userId, maxOccupancy, {
        success: function(chatRoom) {
            Alias.create({
                success: function(alias) {
                    Pubnub.sendPresence("join", alias, pubkey, subkey, {
                        success:function(event) {
                            response.success(alias);
                        },
                        error: response.error
                    })
                },
                error: function(alias, error) {
                    response.error(error);
                }
            });
        },
        error: response.error
    });
});

// Removes a User from a ChatRoom by deactivating the active Alias and
// fires a pubnub presence event.
// Takes: {aliasId: string, pubkey: string, subkey: string}
// Returns: Alias
Parse.Cloud.define("leaveChatRoom", function (request, response) {
    var requiredParams = ["aliasId","pubkey", "subkey"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var aliasId = params.aliasId;
    var pubkey = params.pubkey;
    var subkey = params.subkey;

    Alias.deactivate(aliasId, {
        success: function(alias) {
            sendPresenceEvent("leave", alias, pubkey, subkey, {
                success:function(event) {
                    response.success(alias);
                },
                error: response.error
            });
        },
        error: function(alias, error) {
            response.error(error)
        }
    });
});

// After any Alias is updated, make sure the associated ChatRoom's
// numOccupants field reflects the number of active members..
Parse.Cloud.afterSave("Alias", function(request) {
    var chatRoomId = request.object.get("chatRoomId");
    ChatRoom.get(chatRoomId, {
        success: function(chatRoom) {
            Alias.getActive(chatRoomId, {
                success: function(aliases) {
                    chatRoom.set("numOccupants", aliases.length);
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
