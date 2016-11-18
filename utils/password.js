'use strict';
var crypto = require('crypto');

var genRandomString = function(length){
    return crypto.randomBytes(Math.ceil(length/2))
            .toString('hex') /** convert to hexadecimal format */
            .slice(0,length);   /** return required number of characters */
};

var sha512 = function(password, salt){
    var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt:salt,
        passwordHash:value
    };
};

exports.saltHashPassword = function(userpassword) {
    var salt = genRandomString(16); /** Gives us salt of length 16 */
    var passwordData = sha512(userpassword, salt);
    return {
        hash:passwordData.passwordHash,
        salt:passwordData.salt
    }
}

exports.checkPassword = function(userpassword, hashed, salt) {
    try {
        var candidate = sha512(userpassword, salt);
        return candidate.passwordHash === hashed;
    }
    catch (e) {
        console.log("----------")
        console.log(userpassword);
        console.log(hashed);
        console.log(salt);
        console.log("Error checking password");
        console.log(e);
        console.log("----------")
        return false;
    }
}
