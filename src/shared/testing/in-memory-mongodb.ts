

import { MongooseModule } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import { AccountDocument } from 'src/features/account/mongo-schemas/account.mongo.schema';
import { EmailTokensDocument } from 'src/features/auth/mongo-schemas/email-tokens.mongo.schema';
import { RefreshTokenDocument } from 'src/features/auth/mongo-schemas/refresh-token.mongo.schema';

export class InMemoryMongodb {
  static mongod = new MongoMemoryServer();

  static mongooseTestModule() {
    return MongooseModule.forRootAsync({
      useFactory: async () => {
        return {
          uri: await InMemoryMongodb.mongod.getUri()
        }
      },
    })
  }

  static async disconnect() {
    await InMemoryMongodb.mongod.stop();
  }

  static async insertTestData(userModel: Model<AccountDocument>, refreshTokenModel?: Model<RefreshTokenDocument>, emailTokenModel?: Model<EmailTokensDocument>) {
    // Insert users
    const users = [
      new userModel({ accountId: 'accountId1', email: { value: 'user1@test.com' }, username: 'user1', password: bcrypt.hashSync('pwd1', bcrypt.genSaltSync(10)), roles: [] }),
      new userModel({ accountId: 'accountId2', email: { value: 'user2@test.com' }, username: 'user2', password: bcrypt.hashSync('pwd2', bcrypt.genSaltSync(10)), roles: [] }),
      new userModel({ accountId: 'accountId3', email: { value: 'user3@test.com' }, username: 'user3', password: bcrypt.hashSync('pwd3', bcrypt.genSaltSync(10)), roles: [] }),
      new userModel({ accountId: 'accountId4', email: { value: 'user4@test.com' }, username: 'user4', password: bcrypt.hashSync('pwd4', bcrypt.genSaltSync(10)), roles: [] }),
      new userModel({ accountId: 'accountId5', email: { value: 'user5@test.com' }, username: 'user5', password: bcrypt.hashSync('pwd5', bcrypt.genSaltSync(10)), roles: [] }),
      new userModel({ accountId: 'accountId6', email: { value: 'user6@test.com' }, username: 'user6', password: bcrypt.hashSync('pwd6', bcrypt.genSaltSync(10)), roles: [] }),
      new userModel({ accountId: 'accountId7', email: { value: 'user7@test.com' }, username: 'user7', password: bcrypt.hashSync('pwd7', bcrypt.genSaltSync(10)), roles: [] }),
      new userModel({ accountId: 'accountId8', email: { value: 'user8@test.com' }, username: 'user8', password: bcrypt.hashSync('pwd8', bcrypt.genSaltSync(10)), roles: [] }),
    ];
    await userModel.collection.insertMany(users);

    // Insert refresh tokens
    if (refreshTokenModel) {
      const refreshTokens = [
        new refreshTokenModel({ token: 'token1', user: users[0] }),
        // Will be expired at test time
        new refreshTokenModel({ token: 'token2', expiresAt: Date.now(), user: users[1] }),
        // Revoked
        new refreshTokenModel({ token: 'token3', revokedAt: Date.now(), user: users[2] }),
        // Token to revoke
        new refreshTokenModel({ token: 'token4', user: users[3] }),
        // Token to refresh
        new refreshTokenModel({ token: 'token5', user: users[4] }),
      ];
      await refreshTokenModel.collection.insertMany(refreshTokens);
    }

    // Insert email tokens
    if (emailTokenModel) {
      // We save each email token, si that pre save is fired, and expiresAt date will be set by default
      await new emailTokenModel({ user: users[0], confirmToken: { value: 'token1', expiresAt: Date.now() } }).save();
      await new emailTokenModel({ user: users[1], confirmToken: { value: 'token2' } }).save();
      await new emailTokenModel({ user: users[2], confirmToken: { value: 'token3' } }).save();
      await new emailTokenModel({ user: users[3], resetPasswordToken: { value: 'token4', expiresAt: Date.now() } }).save();
      await new emailTokenModel({ user: users[4], resetPasswordToken: { value: 'token5' } }).save();
      await new emailTokenModel({ user: users[5], confirmToken: { value: 'token6' } }).save();
    }
  }
}
