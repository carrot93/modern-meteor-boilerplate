import { Meteor } from 'meteor/meteor'
import { Accounts } from 'meteor/accounts-base'
import { check } from 'meteor/check'

// copy from
// https://github.com/apollographql/meteor-integration/blob/
// 2881dc449a1d4e96b814c35ab50f22ba92cdf563/src/main-server.js#L127
export const getUserForContext = async loginToken => {
  // there is a possible current user connected!
  if (loginToken) {
    // throw an error if the token is not a string
    check(loginToken, String)

    // the hashed token is the key to find the possible current user in the db
    const hashedToken = Accounts._hashLoginToken(loginToken)

    // get the possible current user from the database
    // note: no need of a fiber aware findOne + a fiber aware call break tests
    // runned with practicalmeteor:mocha if eslint is enabled
    const currentUser = await Meteor.users.rawCollection().findOne({
      'services.resume.loginTokens.hashedToken': hashedToken,
    })

    // the current user exists
    if (currentUser) {
      // find the right login token corresponding, the current user may have
      // several sessions logged on different browsers / computers
      const tokenInformation = currentUser.services.resume.loginTokens.find(
        tokenInfo => tokenInfo.hashedToken === hashedToken,
      )

      // get an exploitable token expiration date
      const expiresAt = Accounts._tokenExpiration(tokenInformation.when)

      // true if the token is expired
      const isExpired = expiresAt < new Date()

      // if the token is still valid, give access to the current user
      // information in the resolvers context
      if (!isExpired) {
        // return a new context object with the current user & her id
        return {
          user: currentUser,
          userId: currentUser._id,
        }
      }
    }
  }

  return {}
}
