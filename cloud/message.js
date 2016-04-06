module.exports.create = create;

function create(alias, body, response) {
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

function getRecentForChatRooms(chatRooms, response) {
    // map chatrooms to ids, grab most recent message for each.
}
