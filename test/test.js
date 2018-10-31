// var passport = require('passport-strategy')
//     ,util = require('util')
var request = require('request-promise')
const baseURI = "https://app.dock.io/api/v1/oauth/"
function Strategy(options, verify) {
    // passport.Strategy.call(this)

    // if(!verify) throw new Error('Dock.io strategy requires a verify function');
    if(!options.client_id) throw new Error('Dock.io strategy requires the client_id');
    if(!options.client_secret) throw new Error('Dock.io strategy requires the client_secret');
    if(!options.private_key) throw new Error('Dock.io strategy requires a private key');
    
    this.name = 'dock.io'
    // this._verify = verify;
    this._client_id = options.client_id
    this._client_secret = options.client_secret
    this._private_key = options.private_key
    // this._passReqToCallback = options.passReqToCallback;
}

// util.inherits(Strategy, passport.Strategy);

/**
 * @description Authenticate a request which containt the dock.io code as a query
 * 
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req) {
    var self = this;
    // function verified(err, user, info) {
    //     if(err){
    //             return self.error(err)
    //     }
    //     if(!user){
    //         return self.fail(info)
    //     }
    //     self.success(user, info)
    // }
    var code = "IjViZDg5Njg5MzAxY2QxMDAwMTc2OGQ1ZCI.bD9uN8dsS19cRUgTRh34b4lAAZA"
    this.setupConnection(code).then(function() {
        getUserData(this._user_data.connection_addr, this._ipfs_addr, this._private_key).then(function(jsonData){
            console.log("JSON DATA", jsonData)
            var payload={
                user_data:self._user_data,
                access_token: self._access_token,
                scopes: self._scopes,
                id: self._id,
                ipfs_addr: self.ipfs_addr,
                json_data: jsonData.json_data
            }

                console.log('payload:-\n',payload)
        })
    })

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
            console.log('access token:- ',access_token)
            initiateConnection(self._access_token, self._client_id, self._client_secret).then(function(connectionDetails){
                self._scopes = connectionDetails.scopes
                self._user_data = connectionDetails.user_data
                self._id = connectionDetails.id
                console.log('scopes:- ',connectionDetails.scopes)
                console.log('user_data:- ',connectionDetails.user_data)
                console.log('id:- ',connectionDetails.id)
                confirmConnection(self._private_key, self._user_data.connection_addr).then( function (packageDetails) {
                    // if(self._client_secret != packageDetails.secret)
                    //     throw new Error("Client secret and the retrieved secret do not match.")
                    self._ipfs_addr = packageDetails.ipfs_addr
                    console.log('package_details :-\n',packageDetails)
                    resolve()
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
            uri:baseURI+"access-token?grant_type=authorization_code&code="+code+"&client_id="+client_id+"&client_secret="+client_secret,
            json:true
        }
        request(options).then(function(parsedBody){
            console.log('parsed body:-\n',typeof parsedBody)
            resolve(parsedBody.access_token)
        }, function(error) {
            console.error(error)
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
                console.error(error)
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
            uri:"https://gateway.dock.io/v1/connection/"+connection_addr+"/confirm",
            json:true
        }

        request(options).then( function(parsedBody) {
            resolve(parsedBody)
        }, function(error) {
            console.error(error)
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
            uri:"https://gateway.dock.io/v1/connection/"+connection_addr+"/packages/"+ipfs_addr,
            json:true
        }
        console.log("getting final data...\n")
        request(options).then(function(parsedBody) {
            console.log(parsedBody)
            resolve(parsedBody)
        })
    })
}

var closeConnection = function (private_key) {
    var options ={
        method:"POST",
        headers:{
            "Content-Type": "application/json",
            "Authorization": "PrivateKey "+private_key
        },
        uri:"https://gateway.dock.io/v1/connection/836e5c8c58d481adf1c38534e31b41588bb01b01/close"
    }
    console.log(private_key)
    request(options).then(function(){
        console.log("connection closed")
    })
}

var options = {
    client_id:"5b648ea5f09b030007bacb92",
    client_secret:"karlo",
    private_key:"dbd31c490ca0f56f267ea9dec7a37995e9bf7c0e69020d4d7004e5e30480f468"
}
closeConnection(options.private_key)
// dock = new Strategy(options)
// data = dock.authenticate()
// console.log(data)