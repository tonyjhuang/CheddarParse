/*
  curl -X POST \
  -H "X-Parse-Application-Id: ${APPLICATION_ID}" \
  -H "X-Parse-REST-API-Key: ${REST_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://api.parse.com/1/functions/hello
*/

var _ = require('cloud/utils/underscore.js');
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

// Return minimum ios build number
// used to force upgrades
Parse.Cloud.define("minimumIosBuildNumber", function(request, response) {
    response.success(15);
});

Parse.Cloud.define("checkRegistrationCode", function(request, response) {
    var requiredParams = ["registrationCode"]
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var validRegistrationCodes = ["test"]
    var registrationCode = params.registrationCode
    var isValidCode = validRegistrationCodes.indexOf(registrationCode) >= 0

    response.success(isValidCode);
});

// Send Feedback to Slack Channel
Parse.Cloud.define("sendFeedback", function(request,response) {
    var requiredParams = ["version", "build", "userId", "chatRoomId","aliasName", "body", "platform", "environment"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var feedbackBody = "Platform: " + params.platform + "\n";
        feedbackBody += "Environment: " + params.environment + "\n";
        feedbackBody += "Version: " + params.version + "\n";
        feedbackBody += "Build: " + params.build + "\n";
        feedbackBody += "UserId: " + params.userId + "\n";
        feedbackBody += "ChatRoomId: " + params.chatRoomId + "\n";
        feedbackBody += "AliasName: " + params.aliasName + "\n";
        feedbackBody += params.body + "\n";
        feedbackBody += "-----------------------";

    sendToFeedbackChannel(feedbackBody, response);
});

// Send Change School request
Parse.Cloud.define("sendChangeSchoolRequest", function(request,response) {
    var requiredParams = ["schoolName", "email", "platform", "environment"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var changeSchoolBody = "Platform: " + params.platform + "\n";
        changeSchoolBody += "Environment: " + params.environment + "\n";
        changeSchoolBody += "Email: " + params.email + "\n";
        changeSchoolBody += "School Request: " + params.schoolName + "\n";
        changeSchoolBody += "-----------------------";

    sendToFeedbackChannel(changeSchoolBody, response);
});

function sendToFeedbackChannel(body, response) {
    Parse.Cloud.httpRequest({
        method: 'POST',
        url: 'https://hooks.slack.com/services/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',
        body: "{\"text\":\"" + body + "\"}",
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
    }).then(function(httpResponse) {
        response.success(httpResponse.text);
    }, function(httpResponse) {
        response.error(httpResponse.text);
    });
}

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
        var endTimeToken = params.endTimeToken;

        Pubnub.replayChannel({subkey: subkey,
                              channel: chatRoomId,
                              startTimeToken: startTimeToken,
                              endTimeToken: endTimeToken,
                              count: count
                             }).then(response.success, response.error);
    }, response.error);
});

// Update a ChatRoom's name.
Parse.Cloud.define("updateChatRoomName", function(request, response) {
    var requiredParams = ["pubkey", "subkey", "aliasId", "name"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var pubkey = params.pubkey;
    var subkey = params.subkey;
    var aliasId = params.aliasId;
    var name = params.name;

    Alias.get(aliasId).then(function(alias) {
        // Set chatroom name.
        ChatRoom.setName(alias.get("chatRoomId"), name).then(function(chatRoom) {
            // Create chatevent.
            ChatEvent.createChangeRoomName(alias, name).then(function(chatEvent) {
                // Send to Pubnub.
                Pubnub.sendChangeRoomName({
                    pubkey: pubkey,
                    subkey: subkey,
                    chatEvent: chatEvent
                }).then(function(result) {
                    response.success(chatRoom)

                }, response.error);
            }, response.error);
        }, response.error);
    }, response.error);
});

// Returns the list of ChatRooms and Aliases that are active for a user,
// as well as the most recent Message for each ChatRoom.
// Takes: userId: string
// Returns: [{alias: Alias, chatRoom: ChatRoom, chatEvent: ChatEvent}, ...]
Parse.Cloud.define("getChatRooms", function(request, response) {
    var requiredParams = ["userId"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    Alias.getActiveForUser(params.userId).then(function(aliases) {
        var chatRoomIds = _.map(aliases, function(a) {
            return a.get("chatRoomId");
        });
        var chatRoomPromises = _.map(chatRoomIds, function(id) {
            return ChatRoom.get(id);
        });
        var chatEventPromises = _.map(chatRoomIds, function(id) {
            return ChatEvent.getMostRecentForChatRoom(id);
        });

        Parse.Promise.when(chatRoomPromises).then(function() {
            var chatRooms = _.values(arguments);

            Parse.Promise.when(chatEventPromises).then(function() {
                var chatEvents = _.values(arguments);
                response.success(
                    formatChatRoomInfo(aliases,chatRooms,chatEvents));

            }, response.error);
        }, response.error);
    }, response.error)
});

function formatChatRoomInfo(aliases, chatRooms, chatEvents) {
    var zipped = _.zip(aliases, chatRooms, chatEvents);
    return _.map(zipped, function(zip) {
        return {
            "alias": zip[0],
            "chatRoom": zip[1],
            "chatEvent": zip[2]
        };
    });
}

// Resends email verification by resetting a User's email
// address. Returns the user.
Parse.Cloud.define("resendVerificationEmail", function(request, response) {
    var requiredParams = ["userId"]
    var params = request.params;
    checkMissingParams(params, requiredParams, response);

    var userId = params.userId;

    Parse.Cloud.useMasterKey();
    User.get(userId).then(function(user) {
        var email = user.get("email")
        // Need to set email to a different value and then reset it to
        // the first email address to resend the verification email.
        // See https://parse.com/questions/verify-email-resend-confirmation-email
        User.updateEmailAddress(userId, "fuckthis@hacky.shit").then(function(user) {
            User.updateEmailAddress(userId, email)
                .then(response.success, response.error);

        }, response.error);
    }, response.error);
});

// Increment our UserCount on new Parse Users.
Parse.Cloud.afterSave(Parse.User, function(request) {
    if (request.object.existed()) {
        return;
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
    User.get(params.userId).then(response.success, response.error);
});

Parse.Cloud.define("findChatRoom", function(request, response) {
    var requiredParams = ["chatRoomId"];
    var params = request.params;
    checkMissingParams(params, requiredParams, response);
    ChatRoom.get(params.chatRoomId).then(response.success, response.error);
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
        return ChatRoom.getAvailableColorId(chatRoom).then(function(colorId) {
            return Alias.create(userId, chatRoom.id, colorId).then(function(alias) {
                // Update num occupants after creating Alias.
                return updateChatRoomOccupants(chatRoom.id).then(function(chatRoom) {
                    console.log(chatRoom);
                    return Parse.Promise.as(alias);
                });
            });
        });

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
        var chatRoomId = alias.get("chatRoomId");
        return updateChatRoomOccupants(chatRoomId).then(function(chatRoom) {
            return ChatEvent.createLeavePresence(alias);
        });

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

// Update a ChatRoom's numOccupants field to reflect
// the number of active Aliases.
function updateChatRoomOccupants(chatRoomId) {
    return Alias.getActiveForChatRoom(chatRoomId).then(function(aliases) {
        return ChatRoom.get(chatRoomId).then(function(chatRoom) {
            chatRoom.set("numOccupants", aliases.length);
            return chatRoom.save();
        });
    });
}


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
