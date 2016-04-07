module.exports.createMessage = createMessage;
module.exports.createJoinPresence = createJoinPresence;
module.exports.createLeavePresence = createLeavePresence;
const TYPE = {
    MESSAGE: {text: "Message"},
    PRESENCE: {text: "Presence"}
};

const P_SUBTYPE = {
    JOIN: {text: " has joined"},
    LEAVE: {text: " has left"}
};

function createMessage(alias, body, response) {
    var Message = Parse.Object.extend("ChatEvent");
    var message = new Message();

    message.set("type", TYPE.MESSAGE.text);
    message.set("body", body);
    message.set("alias", alias);

    message.save(null, response);
}


function createLeavePresence(alias, response) {
    createPresence(alias, P_SUBTYPE.LEAVE, response);
}

function createJoinPresence(alias, response) {
    createPresence(alias, P_SUBTYPE.JOIN, response);
}

function createPresence(alias, subtype, response) {
    var Presence = Parse.Object.extend("ChatEvent");
    var presence = new Presence();

    presence.set("type", TYPE.PRESENCE.text);
    presence.set("body", alias.get("name") + subtype.text);
    presence.set("alias", alias);

    presence.save(null, response);
}
