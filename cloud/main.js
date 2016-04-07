/*
curl -X POST \
 -H "X-Parse-Application-Id: ${APPLICATION_ID}" \
 -H "X-Parse-REST-API-Key: ${REST_API_KEY}" \
 -H "Content-Type: application/json" \
 -d '{}' \
 https://api.parse.com/1/functions/hello
*/

var Alias = require('cloud/alias.js');
var ChatRoom = require('cloud/chatroom.js');
var Message = require('cloud/message.js');
var Pubnub = require('cloud/pubnub.js');
var User = require('cloud/user.js');
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

    Alias.get(params.aliasId, wrap(response, function(alias) {
        var chatRoomId = alias.get("chatRoomId");
        var startTimeToken = params.startTimeToken
            ? params.startTimeToken
            : new Date().getTime() * 10000;
        var endTimeToken = params.endTimeToken
            ? params.endTimeToken
            : alias.get("createdAt").getTime() * 10000;

        Pubnub.replayChannel(subkey,
                             chatRoomId,
                             startTimeToken,
                             endTimeToken,
                             count,
                             response);
    }));
});

// Creates a new User object.
Parse.Cloud.define("registerNewUser", function(request, response) {
    UserCount.count(wrap(response, function(userCount) {
        User.create((userCount+1).toString(), wrap(response));
    }));
});

// Increment our UserCount on new Parse Users.
Parse.Cloud.afterSave(Parse.User, function(request) {
    if (request.object.existed()) {
        return;
    }

    // Wrap console.error in response object.
    var response = {
        error: function(error) {
            console.error(error);
        }
    }

    Parse.Cloud.useMasterKey();
    UserCount.increment(wrap(response, function(userCount) {
        console.log("incremented UserCount");
    }));
});

Parse.Cloud.define("findAlias", function(request, response) {
    var requiredParams = ["aliasId"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);
    Alias.get(params.aliasId, wrap(response));
});

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

    Alias.get(aliasId, wrap(response, function(alias) {
        Message.create(alias, body, wrap(response, function(message) {
            Pubnub.sendMessage(pubkey,
                               subkey,
                               alias.get("chatRoomId"),
                               message,
                               response);
        }));
    }));
});


// Takes: {userId: string, maxOccupancy: int}
// Returns: ChatRoom
Parse.Cloud.define("getNextAvailableChatRoom", function(request, response) {
    var requiredParams = ["userId", "maxOccupancy"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var userId = params.userId;
    var maxOccupancy = params.maxOccupancy;

    User.get(userId, wrap(response, function(user) {
        ChatRoom.getNextAvailableChatRoom(user, maxOccupancy, wrap(response));
    }));
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

    User.get(userId, wrap(response, function(user) {
        ChatRoom.getNextAvailableChatRoom(
            user, maxOccupancy, wrap(response, function(chatRoom) {
                Alias.create(userId, chatRoom.id, wrap(response, function(alias) {
                    // No need to wrap pubnub response objects.
                    Pubnub.sendPresence(pubkey, subkey, alias, "join", {
                        success: function(event) {
                            response.success(alias);
                        },
                        error: response.error
                    });
                }));
            }));
    }));
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

    Alias.deactivate(aliasId, wrap(response, function(alias) {
        // No need to wrap pubnub response objects.
        Pubnub.sendPresence(pubkey, subkey, alias, "leave", {
            success:function(event) {
                response.success(alias);
            },
            error: response.error
        });
    }));
});

// After any Alias is updated, make sure the associated ChatRoom's
// numOccupants field reflects the number of active members.
Parse.Cloud.afterSave("Alias", function(request) {
    // Wrap console.error in response object.
    var response = {
        error: function(error) {
            console.error(error);
        }
    }

    var chatRoomId = request.object.get("chatRoomId");
    ChatRoom.get(chatRoomId, wrap(response, function(chatRoom) {
        Alias.getActive(chatRoomId, wrap(response, function(aliases) {
            chatRoom.set("numOccupants", aliases.length);
            chatRoom.save();
        }));
    }));
});

Parse.Cloud.define("getActiveAliases", function(request, response) {
    var requiredParams = ["chatRoomId"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);
    var chatRoomId = params.chatRoomId;
    Alias.getActiveForChatRoom(chatRoomId, wrap(response));
})

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

// Typically Parse api calls will call response.error with
// the failed object and an error. 99% of the time, we just
// want the error, so pass a wrapped response to these calls.
// You can also pass in a success callback, which will replace
// response.success.
function wrap(response, success) {
    return {
        success: success ? success : response.success,
        error: function(object, error) {
            response.error(error);
        }
    };
}
