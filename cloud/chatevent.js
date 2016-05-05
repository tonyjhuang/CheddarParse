module.exports.createMessage = createMessage;
module.exports.createJoinPresence = createJoinPresence;
module.exports.createLeavePresence = createLeavePresence;
module.exports.createChangeRoomName = createChangeRoomName;
module.exports.getMostRecentForChatRoom = getMostRecentForChatRoom;

const TYPE = {
    MESSAGE: {text: "MESSAGE"},
    PRESENCE: {text: "PRESENCE"},
    CHANGE_ROOM_NAME: {text: "CHANGE_ROOM_NAME"}
};

const P_SUBTYPE = {
    JOIN: {text: " has joined"},
    LEAVE: {text: " has left"}
};

function createMessage(alias, body, messageId) {
    var ChatEvent = Parse.Object.extend("ChatEvent");
    var message = new ChatEvent();

    message.set("type", TYPE.MESSAGE.text);
    message.set("body", body);
    message.set("alias", alias);
    message.set("messageId", messageId);

    return message.save();
}

function createLeavePresence(alias) {
    return createPresence(alias, P_SUBTYPE.LEAVE);
}

function createJoinPresence(alias) {
    return createPresence(alias, P_SUBTYPE.JOIN);
}

function createChangeRoomName(alias, name) {
    var ChatEvent = Parse.Object.extend("ChatEvent");
    var event = new ChatEvent();

    event.set("type", TYPE.CHANGE_ROOM_NAME.text);
    event.set("body", alias.get("name") + " changed the room name to " + name);
    event.set("alias", alias);

    return event.save();
}

function createPresence(alias, subtype) {
    var ChatEvent = Parse.Object.extend("ChatEvent");
    var presence = new ChatEvent();

    presence.set("type", TYPE.PRESENCE.text);
    presence.set("body", alias.get("name") + subtype.text);
    presence.set("alias", alias);

    return presence.save();
}

function getMostRecentForChatRoom(chatRoomId) {
    var aliasQuery = new Parse.Query("Alias");
    aliasQuery.equalTo("chatRoomId", chatRoomId);

    var query = new Parse.Query("ChatEvent");
    query.matchesQuery("alias", aliasQuery);
    query.descending("createdAt");
    query.include("alias");
    return query.first();
}
