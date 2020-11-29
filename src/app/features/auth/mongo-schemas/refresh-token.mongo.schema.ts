import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as SchemaMongoose } from "mongoose";
import { RandomStringUtils } from "../../../shared/utils/random-string.utils";
import { AccountDocument } from "../../account/mongo-schemas/account.mongo.schema";

@Schema({
  collection: 'refresh_tokens'
})
export class RefreshTokenDocument extends Document {

  @Prop({ type: SchemaMongoose.Types.ObjectId, ref: AccountDocument.name })
  account: AccountDocument;

  @Prop({ default: RandomStringUtils.createToken, unique: true })
  token: string;

  @Prop({ default: RandomStringUtils.tokenExpiresAt })
  expiresAt: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: number;

  @Prop({ type: Date })
  revokedAt: number;

  isExpired: boolean;

  isActive: boolean;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshTokenDocument);

RefreshTokenSchema.virtual('isExpired').get(function () {
  return Date.now() > this.expiresAt;
});

RefreshTokenSchema.virtual('isActive').get(function () {
  return !this.revokedAt && !this.isExpired;
});