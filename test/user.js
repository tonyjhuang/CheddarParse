var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../index');
var secrets = require('../secrets')
var should = chai.should();
chai.use(chaiHttp);

var DatabaseCleaner = require('../node_modules/database-cleaner');
var databaseCleaner = new DatabaseCleaner('mongodb');
var connect = require('../node_modules/mongodb').connect;




describe('User', function() {
    before(function (done) {
        connect('mongodb://localhost:27017/dev', function(err, db) {
          databaseCleaner.clean(db, function() {
            console.log('done');
            db.close();
            done();
          });
        });
    });

    it('should list ALL users on parse/users GET', function(done) {
        chai.request(server.app)
        .get('/parse/users')
        .set('X-Parse-Application-Id', secrets.appId)
        .set('X-Parse-REST-API-Key', secrets.masterKey)
        .set('Content-Type', 'application/json')
        .end(function(err, res){
            res.body.results.should.eql([]);
            res.should.have.status(200);
            done();
        });
    });
    it('should add ONE user on parse/users POST', function(done) {
        chai.request(server.app)
        .post('/parse/users')
        .send({'username': 'test', 'password': 'test'})
        .set('X-Parse-Application-Id', secrets.appId)
        .set('X-Parse-REST-API-Key', secrets.masterKey)
        .set('Content-Type', 'application/json')
        .end(function(err, res){
            res.should.have.status(201);
            chai.request(server.app)
            .get('/parse/users')
            .set('X-Parse-Application-Id', secrets.appId)
            .set('X-Parse-REST-API-Key', secrets.masterKey)
            .set('Content-Type', 'application/json')
            .end(function(err, res){
                res.body.results.length.should.equal(1);
                res.should.have.status(200);
                done();
            });
        });
    });
});
