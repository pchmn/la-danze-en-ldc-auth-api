import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailTokenDocument } from '../mongo-schemas/email-token.mongo.schema';
import { EmailService } from './email.service';

class EmailServiceMock {
  sendEmail(emailToken: EmailTokenDocument) { }
}

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EmailService,
          useClass: EmailServiceMock
        },
        ConfigService
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});