SavedUsers = new Set();
module.exports = {
    User : function () {
        this.name = "User";
        this.set = function(type, value) {
            this[type] = value;
        }
        this.save = function() {
            var _this = this;
            var promise = new Promise(function(resolve, reject) {
                if (SavedUsers.add(_this.username)) {
                    resolve(_this);
                }
                else {
                    reject(Error("Couldn't add User"));
                }
            });
            return promise;
        }
        return this;
    },
    Query : function(type) {
        this.get = function(name) {
            switch (type().name) {
                case "User":
                    var promise = new Promise(function(resolve, reject) {
                        if (SavedUsers.has(name)) {
                            resolve(true);
                        }
                        else {
                            reject(Error("Couldn't find User " + name));
                        }
                    });

                    return promise;
            }
        }
    }

}
