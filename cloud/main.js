/*
  curl -X POST \
  -H "X-Parse-Application-Id: ${APPLICATION_ID}" \
  -H "X-Parse-REST-API-Key: ${REST_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://api.parse.com/1/functions/hello
*/

var Alias = require('cloud/alias.js');
var ChatEvent = require('cloud/chatevent.js');
var ChatRoom = require('cloud/chatroom.js');
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
    var requiredParams = ["aliasId", "subkey"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var count = params.count ? params.count : 9999;
    var aliasId = params.aliasId;
    var subkey = params.subkey;

    Alias.get(params.aliasId).then(function(alias) {
        var chatRoomId = alias.get("chatRoomId");
        var startTimeToken = params.startTimeToken
            ? params.startTimeToken
            : new Date().getTime() * 10000;
        var endTimeToken = params.endTimeToken
            ? params.endTimeToken
            : alias.get("createdAt").getTime() * 10000;

        Pubnub.replayChannel({subkey: subkey,
                              channel: chatRoomId,
                              startTimeToken: startTimeToken,
                              endTimeToken: endTimeToken,
                              count: count
                             }).then(response.success, response.error);
    }, response.error);
});

// Creates a new User object.
Parse.Cloud.define("registerNewUser", function(request, response) {
    UserCount.count().then(function(count) {
        return User.create((count+1).toString())

    }).then(response.success, response.error);
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
    UserCount.increment().then(console.log, console.error);
});

// Useful for validating user ids.
Parse.Cloud.define("findAlias", function(request, response) {
    var requiredParams = ["aliasId"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);
    Alias.get(params.aliasId).then(response.success, response.error);
});

// Useful for validating user ids.
Parse.Cloud.define("findUser", function(request, response) {
    var requiredParams = ["userId"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);
    User.get(params.userId, wrap(response));
});

// Sends a message through pubnub, persists it through parse.
// Takes: {body: string, aliasId: string, pubkey: string, subkey: string}
// Returns: ChatEvent (Message)
Parse.Cloud.define("sendMessage", function(request, response) {
    var requiredParams = ["pubkey", "subkey", "body", "aliasId", "messageId"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var body = params.body;
    var aliasId = params.aliasId;
    var pubkey = params.pubkey;
    var subkey = params.subkey;
    var messageId = params.messageId;

    Alias.get(aliasId).then(function(alias) {
        return ChatEvent.createMessage(alias, body, messageId);
    }).then(function(message) {
        // Nested promise to keep message in scope.
        Pubnub.sendMessage({
            pubkey: pubkey,
            subkey: subkey,
            chatEvent: message
        }).then(function(result) {
            response.success(message)

        }, response.error);
    }, response.error)
});

// Takes: {userId: string, maxOccupancy: int}
// Returns: ChatRoom
Parse.Cloud.define("getNextAvailableChatRoom", function(request, response) {
    var requiredParams = ["userId", "maxOccupancy"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var userId = params.userId;
    var maxOccupancy = params.maxOccupancy;

    User.get(userId).then(function(user) {
        return ChatRoom.getNextAvailableChatRoom(user, maxOccupancy);

    }).then(response.success, response.error);
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

    User.get(userId).then(function(user) {
        return ChatRoom.getNextAvailableChatRoom(user, maxOccupancy);

    }).then(function(chatRoom) {
        return Alias.create(userId, chatRoom.id);

    }).then(function(alias) {
        return ChatEvent.createJoinPresence(alias);

    }).then(function(presence) {
        Pubnub.sendPresence({
            pubkey: pubkey,
            subkey: subkey,
            chatEvent: presence
        }).then(function(result) {
            // Return the Alias instead of the pubnub result.
            response.success(presence.get("alias"));
        }, response.error);

    }, response.error);
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

    Alias.deactivate(aliasId).then(function(alias) {
        return ChatEvent.createLeavePresence(alias);

    }).then(function(presence) {
        Pubnub.sendPresence({pubkey: pubkey,
                             subkey: subkey,
                             chatEvent: presence
                            }).then(function(result) {
                                // Return the Alias instead of the pubnub result.
                                response.success(presence.get("alias"));
                            }, response.error);

    }, response.error);
});

// After any Alias is updated, make sure the associated ChatRoom's
// numOccupants field reflects the number of active members.
Parse.Cloud.afterSave("Alias", function(request) {
    var chatRoomId = request.object.get("chatRoomId");


    Alias.getActive(chatRoomId).then(function(aliases) {
        ChatRoom.get(chatRoomId).then(function(chatRoom) {
            chatRoom.set("numOccupants", aliases.length);
            chatRoom.save();

        }, console.error);
    }, console.error);
});


// Gets the list of ACTIVE Aliases for a given ChatRoom.
// Takes: chatRoomId: string
// Returns: [Alias, Alias, ...]
Parse.Cloud.define("getActiveAliases", function(request, response) {
    var requiredParams = ["chatRoomId"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    Alias.getActiveForChatRoom(params.chatRoomId)
        .then(response.success, response.error);
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
