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
    var code = "IjViZTAzYjk5YjNmNjNhMDAwMTg2YjVhOSI.HiWMehHTWtyvgR_k2HtwDCyrMNc"
    this.setupConnection(code).then(function(dataObject) {
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
                console.log('scopes:- ',connectionDetails.scopes)
                console.log('user_data:- ',connectionDetails.user_data)
                console.log('id:- ',connectionDetails.id)
                confirmConnection(self._private_key, connectionDetails.user_data.connection_addr).then( function (packageDetails) {
                    // if(self._client_secret != packageDetails.secret)
                    //     throw new Error("Client secret and the retrieved secret do not match.")
                    console.log('package_details :-\n',packageDetails)
                    resolve({connectionDetails: connectionDetails, packageDetails: packageDetails})
                })
            })
        })

    })
}

Strategy.prototype.getDetails = function(connection_addr, ipfs_addr){
    getUserData(connection_addr, ipfs_addr, this._private_key).then(function(jsonData){
        console.log("JSON DATA", jsonData.$data)
        // var payload={
        //     user_data:self._user_data,
        //     access_token: self._access_token,
        //     scopes: self._scopes,
        //     id: self._id,
        //     ipfs_addr: self.ipfs_addr,
        //     json_data: jsonData.json_data
        // }

            // console.log('payload:-\n',payload)
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
        uri:"https://gateway.dock.io/v1/connection/fac096c7d6b452acf9a391856bc7d968fdd38d76/close"
    }
    request(options).then(function(parsedBody){
        console.log(parsedBody)
        console.log("connection closed")
    })
}

var getPackages = function(connection_addr, private_key){
    return new Promise(function(resolve,reject) {
        var options={
            method:"GET",
            headers:{
                "Content-Type": "application/json",
                "Authorization": "PrivateKey "+private_key
            },
            uri:"https://gateway.dock.io/v1/all-connections",
            json:true
        }
        console.log("packages data...\n")
        request(options).then(function(parsedBody) {
            console.log(parsedBody[parsedBody.length-1].package_headers)
            resolve(parsedBody)
        })
    })
}

var registerWebhook = function(private_key){
    return new Promise(function(resolve,reject) {
        var options={
            method:"PUT",
            headers:{
                "Content-Type": "application/json",
                "Authorization": "PrivateKey "+private_key
            },
            body:{
                "payload_url":"https://webhook.site/fbf0bfe4-6bd1-47f7-822c-44dbac25a44a",
                "secret":"ipsum mellons"
            },
            uri:"https://gateway.dock.io/v1/webhook",
            json:true
        }
        console.log("packages data...\n")
        request(options).then(function(parsedBody) {
            console.log(parsedBody)
            resolve(parsedBody)
        })
    })
}


var options = {
    client_id:"",
    client_secret:"",
    private_key:""
}
// closeConnection(options.private_key)
registerWebhook(options.private_key)
// dock = new Strategy(options)
// dock.getDetails("17f3b51fe8d8e2c870ba0e8d2847744aa3db8e0b","QmnNENUTzhxP5gHU2uEgk73tmbva84PGMeEVHihvEqDT96")
// dock.authenticate()
// getPackages("17f3b51fe8d8e2c870ba0e8d2847744aa3db8e0b", options.private_key)

var str = "https://app.dock.io/oauth/authorize?client_id=5b648ea5f09b030007bacb92&redirect_uri=https://echo.dock.io/testclient-oauth/&response_type=code&scope=https://getdock.github.io/schemas/basicUserProfile.json,https://getdock.github.io/schemas/email.json,https://getdock.github.io/schemas/jobExperience.json,https://getdock.github.io/schemas/skills.json,https://getdock.github.io/schemas/userProfile.json,,https://getdock.github.io/schemas/contactInfo.json"