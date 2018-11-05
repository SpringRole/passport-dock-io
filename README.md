THIS IS AN EXPERIMENTAL VERSION. PRODUCTION USE IS NOT RECOMMENDED

# passport-dock-io

[Passport](http://passportjs.org/) strategy for authenticating with [Dock.io](https://dock.io/)

This module lets you authenticate using Dock.io in your Node.js applications.
By plugging into Passport, Dock.io authentication can be easily and
unobtrusively integrated into any application or framework that supports
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/).

## Install

    $ npm install passport-dock-io

## Usage

#### Configure Strategy

The Dock.io authentication strategy authenticates users having a Dock.io
account.  The strategy requires a `verify` callback, which
accepts these credentials and calls `done` providing a user, as well as
`options` specifying a client_id, prvKey, and client_secret.

    passport.use(new DockIOStrategy({
        client_id: CLIENT_ID,
        prvKey: PRIVATE_KEY,
        client_secret: "Something-secret"
      },
      function(connection_addr, done) {
        //check if connection address is associated with a user/webhook notification for new package
        //exists if it does then update retrieve the existing user, else confirm the connection using
        // docks api then:
        // use the ipfs address from the webhook to retrieve the user data using docks api's 
      }
    ));

#### Parameters

The verify callback can be supplied with the `request` object by setting
the `passReqToCallback` option to true, and changing callback arguments
accordingly.

    passport.use(new DockIOStrategy({
        client_id: CLIENT_ID,
        prvKey: PRIVATE_KEY,
        client_secret: "Something-secret"
      },
      function(req, profile, done) {
        // request object is now first argument
        // ...
      }
    ));

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'dock-io'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

    app.get('/auth/dock-io',
      passport.authenticate('dock-io'));

    app.get('/auth/dock-io',
      passport.authenticate('dock-io', { failureRedirect: '/login' }),
      function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
      });

## Credits

  - [Vinay Agarwal](http://github.com/vinay035)
  - [Kartik Mandaville](http://github.com/kar2905)
  - [George Mammen Jacob](http://github.com/gmjacob)

## License

[The MIT License](http://opensource.org/licenses/MIT)
