/* eslint-disable import/first */
process.env.AWS_REGION = 'ap-northeast-1';
process.env.MAIN_TABLE_NAME = 'test-table';
process.env.MAIN_TABLE_GSI1_NAME = 'gsi1';
process.env.MAIN_TABLE_GSI2_NAME = 'gsi2';
process.env.MAIN_TABLE_GSI3_NAME = 'gsi3';
process.env.ROOT_URI = 'https://api.example.com/';

import { UnknownApplicationError } from '../../../../application/errors/application-errors';
import { generateAPIGatewayProxyEventV2 } from '../../../../lib/tests/apigateway-event-v2-helper';
import { ListUserController } from './list-user-controller';
import { ListUserServiceStub } from '../../../../application/users/list/list-user-service-stub';
import { User } from '../../../../domain/models/users/user';
import { UserId } from '../../../../domain/models/users/user-id';
import { UserName } from '../../../../domain/models/users/user-name';
import { MailAddress } from '../../../../domain/models/users/mail-address';
import { UserData } from '../../../../application/users/user-data';

const listUserService = new ListUserServiceStub();
const listUserController = new ListUserController({ listUserService });

describe('ユーザー一覧取得', () => {
  test('ユーザー一覧を取得できる', async () => {
    const userId = '203881e1-99f2-4ce6-ab6b-785fcd793c92';
    const userName = 'テストユーザー名';
    const mailAddress = 'user1@example.com';
    jest
      .spyOn(ListUserServiceStub.prototype, 'handle')
      .mockResolvedValueOnce([
        new UserData(
          new User(
            new UserId(userId),
            new UserName(userName),
            new MailAddress(mailAddress)
          )
        ),
      ]);

    const response = await listUserController.handle({
      ...generateAPIGatewayProxyEventV2(),
    });

    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify([
        {
          user_id: userId,
          user_name: userName,
          mail_address: mailAddress,
        },
      ]),
    });
  });

  test('0件のユーザーを取得できる', async () => {
    jest
      .spyOn(ListUserServiceStub.prototype, 'handle')
      .mockResolvedValueOnce([]);

    const response = await listUserController.handle({
      ...generateAPIGatewayProxyEventV2(),
    });

    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify([]),
    });
  });

  test('limitにnumber型に変換できない値が設定されているとBadRequestを返す', async () => {
    jest.spyOn(ListUserServiceStub.prototype, 'handle');

    const response = await listUserController.handle({
      ...generateAPIGatewayProxyEventV2(),
      queryStringParameters: {
        limit: '10a',
      },
    });

    expect(response).toEqual({
      statusCode: 400,
      body: JSON.stringify({
        name: 'BadRequest',
        message: 'Limit type is not number',
      }),
    });
  });

  test('一度に100より多くのユーザーを取得しようすとるとBadRequestを返す', async () => {
    jest.spyOn(ListUserServiceStub.prototype, 'handle');

    const response = await listUserController.handle({
      ...generateAPIGatewayProxyEventV2(),
      queryStringParameters: {
        limit: '101',
      },
    });

    expect(response).toEqual({
      statusCode: 400,
      body: JSON.stringify({
        name: 'BadRequest',
        message: 'Cannot get users more than 100',
      }),
    });
  });

  test('不明なエラーによってユーザー一覧取得に失敗した場合はInternalServerErrorを返す', async () => {
    jest
      .spyOn(ListUserServiceStub.prototype, 'handle')
      .mockRejectedValueOnce(
        new UnknownApplicationError(new Error('test error'))
      );

    const response = await listUserController.handle({
      ...generateAPIGatewayProxyEventV2(),
    });

    expect(response).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        name: 'InternalServerError',
        message: 'Failed to list user',
      }),
    });
  });
});
