module.exports.createMessage = createMessage;
module.exports.createJoinPresence = createJoinPresence;
module.exports.createLeavePresence = createLeavePresence;
const TYPE = {
    MESSAGE: {text: "MESSAGE"},
    PRESENCE: {text: "PRESENCE"}
};

const P_SUBTYPE = {
    JOIN: {text: " has joined"},
    LEAVE: {text: " has left"}
};

function createMessage(alias, body) {
    var Message = Parse.Object.extend("ChatEvent");
    var message = new Message();

    message.set("type", TYPE.MESSAGE.text);
    message.set("body", body);
    message.set("alias", alias);

    return message.save(null);
}


function createLeavePresence(alias) {
    return createPresence(alias, P_SUBTYPE.LEAVE);
}

function createJoinPresence(alias) {
    return createPresence(alias, P_SUBTYPE.JOIN);
}

function createPresence(alias, subtype) {
    var Presence = Parse.Object.extend("ChatEvent");
    var presence = new Presence();

    presence.set("type", TYPE.PRESENCE.text);
    presence.set("body", alias.get("name") + subtype.text);
    presence.set("alias", alias);

    return presence.save(null);
}
