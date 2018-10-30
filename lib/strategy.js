var passport = require('passport-strategy')
    ,util = require('util')
var request = require('request-promise')

function Strategy(options, verify) {
    passport.Strategy.call(this)

    if(!verify) throw new Error('Dock.io strategy requires a verify function');
    if(!options.client_id) throw new Error('Dock.io strategy requires the client_id');
    if(!options.client_secret) throw new Error('Dock.io strategy requires the client_secret');
    if(!options.private_key) throw new Error('Dock.io strategy requires a private key');
    
    this.name = 'dock.io'
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
        getUserData(this._user_data.connection_addr, this._ipfs_addr, this._private_key).then(function(jsonData){
            var payload={
                user_data:this._user_data,
                access_token: this._access_token,
                scopes: this._scopes,
                id: this._id,
                ipfs_addr: this.ipfs_addr,
                json_data: jsonData.json_data
            }

            if(self._passReqToCallback) {
                self._verify(req, payload, verified)
            } else {
                self._verify(payload, verified)
            }
        })
    })

}
/**
 * @description Initialises a connection between the client and the user
 * @param {String} code - the auth code retrieved on redirection from dock.io
 */
Strategy.prototype.setupConnection= function(code) {
    return new Promise(function(resolve, reject) {
        // Use the code in the req query to get the access token
        getAccessToken(code, this._client_secret, this._client_id).then(function(access_token) {
            this._access_token = access_token
            initiateConnection(this._access_token, this._client_id, this._client_secret).then(function(connectionDetails){
                this._scopes = connectionDetails.scopes
                this._user_data = connectionDetails.user_data
                this._id = connectionDetails.id
                confirmConnection(this._private_key, this._user_data.connection_addr).then( function (packageDetails) {
                    if(this._client_secret != packageDetails.secret)
                        throw new Error("Client secret and the retrieved secret do not match.")
                    this._ipfs_addr = packageDetails.ipfs_addr
                })
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
            uri:"https://app.dock.io/api/v1/oauth/access-token?grant_type=authorization_code&code="+code+"&client_id="+client_id+"&client_secret="+client_secret
        }
        request(options).then(function(parsedBody){
            if(typeof parsedBody.access_token !="undefined")
                resolve(parsedBody.access_token)
            else
                resolve(null)
        }, function(error) {
            console.log(error)
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
            uri:'https://app.dock.io/api/v1/oauth/user-data?client_id='+client_id+"&client_secret="+client_secret
        }
        request(options).then(function(parsedBody) {
            resolve(parsedBody)
            }, function(error) {
                console.log(error)
                reject(error)
            })
    })
}

/**
 * @desc Confirms the connection between the client and the user using the accesss token
 */
var confirmConnection = function(private_key, connection_addr) {
    return new Promise(function(resolve, reject) {
        var options = {
            method: "POST",
            headers:{
                "Content-Type": "application/json",
                "Authorization": "PrivateKey "+private_key
            },
            uri:"https://gateway.dock.io/v1/connection/"+connection_addr+"/confirm"
        }

        request(options).then( function(parsedBody) {
            resolve(parsedBody)
        }, function(error) {
            console.log(error)
            reject(error)
        })
    })
}

/**
 * @desc After a connection exists, it is used to retrieved the data requested from the user
 */
var getUserData = function(connection_addr, ipfs_addr, private_key){
    return new Promise(function(resolve,reject) {
        var options={
            method:"GET",
            headers:{
                "Content-Type": "application/json",
                "Authorization": "PrivateKey "+private_key
            },
            uri:"https://gateway.dock.io/v1/connection/"+connection_addr+"/packages/"+ipfs_addr
        }
        request(options).then(function(parsedBody) {
            resolve(parsedBody)
        })
    })
}