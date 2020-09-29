import 'source-map-support/register';
import { CircleUpdateServiceInterface } from '../../../../application/circle/update/circleUpdateServiceInterface';
import { APIGatewayProxyResult } from 'aws-lambda';
import { Bootstrap } from '../../../utils/bootstrap';
import { CircleUpdateService } from '../../../../application/circle/update/circleUpdateService';
import { CircleUpdateCommand } from '../../../../application/circle/update/circleUpdateCommand';
import { isStringArray } from '../../../../util/typeGuard';
import {
  CircleNotFoundApplicationError,
  MembersNotFoundApplicationError,
  OwnerNotFoundApplicationError,
} from '../../../../application/error/error';
import { badRequest, internalServerError } from '../../../utils/httpResponse';

type CircleUpdateEvent = {
  pathParameters?: { circleId?: string };
  body?: string;
};

export class CircleUpdateController {
  private readonly circleUpdateService: CircleUpdateServiceInterface;

  constructor(props: {
    readonly circleUpdateService: CircleUpdateServiceInterface;
  }) {
    this.circleUpdateService = props.circleUpdateService;
  }

  async handle(event: CircleUpdateEvent): Promise<APIGatewayProxyResult> {
    if (event.body == null) {
      return badRequest('request body is null');
    }

    const circleId = event.pathParameters?.circleId;
    if (typeof circleId !== 'string') {
      return badRequest('circle id type is not string');
    }

    const body = JSON.parse(event.body);
    const circleName = body.circle_name;
    const ownerId = body.owner_id;
    const memberIds = body.member_ids;

    if (circleName == null && ownerId == null && memberIds == null) {
      return badRequest('circle_name, owner_id or member_ids are undefined');
    }
    if (circleName != null && typeof circleName !== 'string') {
      return badRequest('circle_name type is not string');
    }
    if (ownerId != null && typeof ownerId !== 'string') {
      return badRequest('owner_id type is not string');
    }
    if (memberIds != null && !isStringArray(memberIds)) {
      return badRequest('member_ids type is not string[]');
    }

    const command = new CircleUpdateCommand({
      circleId,
      circleName,
      ownerId,
      memberIds,
    });

    const error = await this.circleUpdateService
      .handle(command)
      .catch((error: Error) => error);

    if (error instanceof Error) {
      if (error instanceof CircleNotFoundApplicationError) {
        return badRequest(`circle id: ${circleId} is not found`);
      }
      if (error instanceof OwnerNotFoundApplicationError) {
        return badRequest(`owner id: ${ownerId} is not found`);
      }
      if (error instanceof MembersNotFoundApplicationError) {
        return badRequest(error.message);
      }
      return internalServerError({ message: 'circle update is failed', error });
    }
    return {
      statusCode: 204,
      body: JSON.stringify({}),
    };
  }
}

const bootstrap = new Bootstrap();
const circleUpdateService = new CircleUpdateService({
  circleRepository: bootstrap.getCircleRepository(),
  userRepository: bootstrap.getUserRepository(),
});
const circleUpdateController = new CircleUpdateController({
  circleUpdateService,
});

export const handle = async (event: CircleUpdateEvent) =>
  await circleUpdateController.handle(event);
