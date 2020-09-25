import { UserDeleteCommand } from '#/application/user/delete/userDeleteCommand';
import { UserId } from '#/domain/models/user/userId';
import { UnknownError } from '#/util/error';
import { UserNotFoundRepositoryError } from '#/repository/error/error';
import { systemLog } from '#/util/systemLog';
import { UserRepositoryInterface } from '#/domain/models/user/userRepositoryInterface';
import { UserDeleteServiceInterface } from '#/application/user/delete/userDeleteServiceInterface';

export class UserDeleteService implements UserDeleteServiceInterface {
  constructor(private readonly userRepository: UserRepositoryInterface) {}

  async handle(command: UserDeleteCommand) {
    const targetId = new UserId(command.getUserId());
    const response = await this.userRepository
      .get(targetId)
      .catch((error: Error) => {
        return error;
      });

    if (response instanceof Error) {
      // 対象が見つからなかった場合も削除成功とする
      if (response instanceof UserNotFoundRepositoryError) {
        systemLog('WARN', response.message);
        return;
      }
      throw new UnknownError('unknown error', response);
    }

    await this.userRepository.delete(response);
  }
}
