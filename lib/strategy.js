var passport = require('passport-strategy')
    ,util = require('util')
var request = require('request-promise')

const baseURI = "https://app.dock.io/api/v1/oauth/"
const gatwayDockURI = "https://gateway.dock.io/v1/connection/"

function Strategy(options, verify) {
    passport.Strategy.call(this)

    if(!verify) throw new Error('Dock.io strategy requires a verify function');
    if(!options.client_id) throw new Error('Dock.io strategy requires the client_id');
    if(!options.client_secret) throw new Error('Dock.io strategy requires the client_secret');
    if(!options.private_key) throw new Error('Dock.io strategy requires a private key');
    
    this.name = 'dock-io'
    this._verify = verify;
    this._client_id = options.client_id
    this._client_secret = options.client_secret
    this._private_key = options.private_key
    this._passReqToCallback = options.passReqToCallback;
}

util.inherits(Strategy, passport.Strategy);

/**
 * @description Authenticate a request which containt the dock.io code as a query
 * 
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req) {
    var self = this;
    function verified(err, user, info) {
        if(err){
                return self.error(err)
        }
        if(!user){
            return self.fail(info)
        }
        self.success(user, info)
    }
    
    setupConnection(req.query.code).then(function() {
        var payload={
            user_data:self._user_data,
            access_token: self._access_token,
            scopes: self._scopes,
            id: self._id,
        }

        if(self._passReqToCallback) {
            self._verify(req, payload, verified)
        } else {
            self._verify(payload, verified)
        }
    })

}

Strategy.prototype.retrieveUserData = function (
    ipfs_addr, 
    connection_addr = this._user_data.connection_addr
    ) {
    var self = this
    return new Promise(function(resolve,reject) {
        var options={
            method:"GET",
            headers:{
                "Content-Type": "application/json",
                "Authorization": "PrivateKey "+self._private_key
            },
            uri:gatwayDockURI+connection_addr+"/packages/"+ipfs_addr,
            json:true
        }
        request(options).then(function(parsedBody) {
            resolve(parsedBody)
        })
    })
}

Strategy.prototype.confirmConnection = function(
    connection_addr = this._user_data
    ){
    self = this
    return new Promise(function(resolve, reject) {
        var options = {
            method: "POST",
            headers:{
                "Content-Type": "application/json",
                "Authorization": "PrivateKey "+private_key
            },
            uri:gatwayDockURI+connection_addr+"/confirm",
            json:true
        }

        request(options).then( function(parsedBody) {
            resolve(parsedBody)
        }, function(error) {
            reject(error)
        })
    })
}

/**
 * @description Initialises a connection between the client and the user
 * @param {String} code - the auth code retrieved on redirection from dock.io
 */
Strategy.prototype.setupConnection= function(code) {
    return new Promise(function(resolve, reject) {
        var self = this
        // Use the code in the req query to get the access token
        getAccessToken(code, self._client_secret, self._client_id).then(function(access_token) {
            self._access_token = access_token
            initiateConnection(self._access_token, self._client_id, self._client_secret).then(function(connectionDetails){
                self._scopes = connectionDetails.scopes
                self._user_data = connectionDetails.user_data
                self._id = connectionDetails.id
            })
        })

    })
}


/**
 * @desc Gets the acces token from dock.io
 */
var getAccessToken = function(code, client_secret, client_id){
    return new Promise(function(resolve, reject){
        var options={
            type:"GET",
            uri:baseURI+"access-token?grant_type=authorization_code&code="+code+"&client_id="+client_id+"&client_secret="+client_secret,
            json:true
        }
        request(options).then(function(parsedBody){
            if(typeof parsedBody.access_token !="undefined")
                resolve(parsedBody.access_token)
            else
                resolve(null)
        }, function(error) {
            reject(error)
        })
    })
}

/**
 * @desc Initiates the connection between the client and the user using the accesss token
 */
var initiateConnection = function (access_token, client_id, client_secret) {
    return new Promise(function(resolve, reject){
        var options = {
            method:"GET",
            headers: {
                "Authorization":"Bearer "+access_token
            },
            uri:baseURI+'user-data?client_id='+client_id+"&client_secret="+client_secret,
            json:true
        }
        request(options).then(function(parsedBody) {
            resolve(parsedBody)
            }, function(error) {
                reject(error)
            })
    })
}

module.exports = Strategy;