module.exports.get = get;
module.exports.getNextAvailableChatRoom = getNextAvailableChatRoom;
module.exports.getForAliases = getForAliases;

function get(chatRoomId, response) {
    var query = new Parse.Query("ChatRoom");
    query.get(chatRoomId, response);
}

// Retrieves the next available ChatRoom for the user with the
// given id. Creates a new ChatRoom if none exist.
function getNextAvailableChatRoom(user, maxOccupancy, response) {
    var aliasQuery = new Parse.Query("Alias");
    aliasQuery.equalTo("userId", user.id);

    var chatRoomQuery = new Parse.Query("ChatRoom");

    // Don't return ChatRooms that this User already has an Alias for.
    chatRoomQuery.doesNotMatchKeyInQuery("objectId", "chatRoomId", aliasQuery);
    chatRoomQuery.equalTo("maxOccupancy", maxOccupancy);
    chatRoomQuery.notEqualTo("numOccupants", 0);
    chatRoomQuery.ascending("numOccupants");

    chatRoomQuery.first({
        success: function(chatRoom) {
            if (chatRoom == undefined) {
                createChatRoom(maxOccupancy, response);
            } else {
                response.success(chatRoom);
            }
        },
        error: response.error
    });
}

// Creates and returns a new ChatRoom.
function createChatRoom(maxOccupancy, response) {
    var ChatRoom = Parse.Object.extend("ChatRoom");
    var chatRoom = new ChatRoom();

    chatRoom.set("maxOccupancy", maxOccupancy);
    chatRoom.set("numOccupants", 0);

    chatRoom.save(null, response);
}

function getForAliases(aliases, response) {
  // map aliases to ids, grab chatrooms.
}
