import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ApolloError } from 'apollo-server-express';
import * as jwt from 'jsonwebtoken';
import { Model } from 'mongoose';
import { UserDocument } from 'src/features/user.mongo.schema';
import { JwtToken, LoginInput, SignupInput, TokenInput, UserRoleType } from 'src/generated/graphql.schema';
import { LaDanzeError } from 'src/shared/errors/la-danze-error';
import { MongooseValidationErrorMapper } from 'src/shared/errors/mongoose-validation-error-mapper';
import { RefreshTokenDocument } from '../mongo-schemas/refresh-token.mongo.schema';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(UserDocument.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private refreshTokenService: RefreshTokenService) { }

  /**
   * Signup new user
   * 
   * @param input the signup input
   * @returns refresh and access tokens
   * 
   * @throws {LaDanzeError}
   * This exception is thrown if:
   *  - email or username already exist
   *  - email format is not valid 
   */
  async signup(input: SignupInput): Promise<JwtToken> {
    // First create user
    const userCreated = await this.createUser(input);
    // Then create tokens
    return this.createTokens(userCreated);
  }

  /**
   * Create a user
   * 
   * @param input the signup input
   * @returns the user created
   * 
   * @throws {LaDanzeError}
   * This exception is thrown if:
   *  - email or username already exist
   *  - email format is not valid 
   */
  private async createUser(input: SignupInput): Promise<UserDocument> {
    // Init to wait mongoose to finish building index
    return this.userModel.init()
      .then(() => new this.userModel({
        email: input.email,
        username: input.username,
        password: input.password,
        roles: [{ application: 'twitter', role: UserRoleType.ADMIN }],
        createdAt: Date.now()
      }).save())
      // Map mongoose ValidationError to LaDanzeError
      .catch(err => { throw MongooseValidationErrorMapper.mapEmailAndUsernameErrors(err) });
  }

  /**
   * Login a user
   * 
   * @param input the login input
   * @returns refresh and access tokens 
   * 
   * @throws {LaDanzeError}
   * This exception is thrown if:
   *  - user is not found
   *  - password is wrong
   */
  async login(input: LoginInput): Promise<JwtToken> {
    // Get user
    const user = await this.userModel.findOne().or([{ email: input.emailOrUsername }, { username: input.emailOrUsername }]);
    // Check if user exists
    if (!user) {
      throw LaDanzeError.userNotFound(input.emailOrUsername);
    }
    // Check password
    if (!(await user.validatePassword(input.password))) {
      throw LaDanzeError.wrongCredentials();
    }
    // Create refresh and access tokens
    return this.createTokens(user);
  }

  /**
   * Refresh a token
   *
   * @param input the token input
   * @returns new refresh and access tokens
   * 
   * @throws {LaDanzeError}
   * This exception is thrown if:
   *  - token is expired
   *  - token is revoked
   *  - token is not found
   */
  async refreshToken(input: TokenInput) {
    // Refresh token
    const refreshToken = await this.refreshTokenService.refreshToken(input.token);
    // Create refresh and access tokens in parallel
    return this.createTokens(refreshToken.user, refreshToken);
  }

  /**
   * Create refresh and access tokens
   * 
   * @param user the user to authenticate with the tokens
   * @param [refreshToken] the refresh token already created
   * @returns refresh and access tokens 
   * 
   * @throws {LaDanzeError} if access token can't be created
   */
  private async createTokens(user: UserDocument, refreshToken?: RefreshTokenDocument): Promise<JwtToken> {
    // If refresh token is already created, use it directly
    const refreshToken$ = refreshToken ? refreshToken : this.refreshTokenService.createRefreshToken(user)
    // Create refresh and access tokens in parallel
    return Promise.all([refreshToken$, this.createAccessToken(user)])
      .then(([newRefreshToken, accessToken]) => {
        // Return refresh and access tokens
        return { refreshToken: newRefreshToken.token, accessToken };
      })
      .catch((err: ApolloError) => { throw err; });
  }

  /**
   * Create an access token (JWT)
   * 
   * @param user the user to authenticate with the access token
   * @returns an access token (JWT)
   * 
   * @throws {LaDanzeError} if access token can't be created
   */
  private async createAccessToken(user: UserDocument): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create token (180s lifetime)
      jwt.sign({ username: user.username, roles: user.roles, createdAt: user.createdAt }, this.configService.get('jwt.privateKey'), { algorithm: 'RS256', expiresIn: '180s' }, (err, token) => {
        if (err) {
          return reject(LaDanzeError.cantCreateToken());
        }
        return resolve(token);
      });
    })
  }
}