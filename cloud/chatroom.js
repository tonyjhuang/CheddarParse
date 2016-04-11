module.exports.get = get;
module.exports.getNextAvailableChatRoom = getNextAvailableChatRoom;

function get(chatRoomId) {
    var query = new Parse.Query("ChatRoom");
    return query.get(chatRoomId);
}

// Retrieves the next available ChatRoom for the user with the
// given id. Creates a new ChatRoom if none exist.
function getNextAvailableChatRoom(user, maxOccupancy) {
    var aliasQuery = new Parse.Query("Alias");
    aliasQuery.equalTo("userId", user.id);

    var query = new Parse.Query("ChatRoom");

    // Don't return ChatRooms that this User already has an Alias for.
    query.doesNotMatchKeyInQuery("objectId", "chatRoomId", aliasQuery);
    query.equalTo("maxOccupancy", maxOccupancy);
    query.notEqualTo("numOccupants", 0);
    query.ascending("numOccupants");

    return query.first().then(function(chatRoom) {
        if (chatRoom == undefined) {
            return createChatRoom(maxOccupancy);
        } else {
            return Parse.Promise.as(chatRoom);
        }
    });
}

// Creates and returns a new ChatRoom.
function createChatRoom(maxOccupancy) {
    var ChatRoom = Parse.Object.extend("ChatRoom");
    var chatRoom = new ChatRoom();

    chatRoom.set("maxOccupancy", maxOccupancy);
    chatRoom.set("numOccupants", 0);

    return chatRoom.save(null);
}
