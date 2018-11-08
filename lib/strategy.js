var passport = require('passport-strategy')
    ,util = require('util')
var request = require('request-promise')

const baseURI = "https://app.dock.io/api/v1/oauth/"
const gatwayDockURI = "https://gateway.dock.io/v1/connection/"

function Strategy(options, verify) {
    passport.Strategy.call(this)

    if(!verify) throw new Error('Dock.io strategy requires a verify function');
    if(!options.client_id) throw new Error('Dock.io strategy requires a client_id');
    if(!options.client_secret) throw new Error('Dock.io strategy requires a client_secret');
    
    this.name = 'dock-io'
    this._verify = verify;
    this._client_id = options.client_id
    this._client_secret = options.client_secret
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
    
    self.setupConnection(req.query.code).then(function() {
        var payload={
            user_data:self._user_data,
            access_token: self._access_token,
            scopes: self._scopes
        }

        if(self._passReqToCallback) {
            self._verify(req, payload, verified)
        } else {
            self._verify(payload, verified)
        }
    }, function(error) { verified(error,null) })

}

/**
 * @description Initialises a connection between the client and the user
 * @param {String} code - the auth code retrieved on redirection from dock.io
 */
Strategy.prototype.setupConnection= function(code) {
    var self = this
    return new Promise(function(resolve, reject) {
        // Use the code in the req query to get the access token
        getAccessToken(code, self._client_secret, self._client_id).then(function(access_token) {
            self._access_token = access_token
            initiateConnection(self._access_token, self._client_id, self._client_secret).then(function(connectionDetails){
                self._scopes = connectionDetails.scopes
                self._user_data = connectionDetails.user_data
                resolve()
            },function(error){reject(error)})
        },function(error){reject(error)})

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