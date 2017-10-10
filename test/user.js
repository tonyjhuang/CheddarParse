var chai = require('chai');
var User = require('../cloud/user.js');
var should = chai.should();
var expect = chai.expect;

Parse = require('./parseFactory.js');


describe('User Creation **************************************', function() {
    it('should create the correct user on Parse', function(done) {
        User.create("test")
        .then(function (payload) {
            describe('Username/Password Test', function() {
                it('should create the correct username', function() {
                    expect(payload.username).to.equal("test");
                });
                it('should create the correct username', function() {
                    expect(payload.password).to.equal("password");
                });
            });

            return User.get("test");
        })
        .then(function (payload) {
            describe('Can get the correct user', function() {
                it('should get the user that was created', function() {
                    expect(payload).to.be.true;
                })
            });
            done();
        })
        .catch(function (payload) {
            if(payload.code === 202) {
                User.get("test")
                .then(function (payload) {
                    payload.should.equal(true);
                    done();
                });
            }
            else {
                console.log("ERROR: " + payload.code + " - " + payload.message);
            }
        })
    });
})
