import 'source-map-support/register';
import { CircleRegisterServiceInterface } from '../../../../application/circle/register/circleRegisterServiceInterface';
import { CircleRegisterService } from '../../../../application/circle/register/circleRegisterService';
import { CircleRegisterCommand } from '../../../../application/circle/register/circleRegisterCommand';
import { APIGatewayProxyResult } from 'aws-lambda';
import { CircleDuplicateApplicationError } from '../../../../application/error/error';
import { Bootstrap } from '../../../utils/bootstrap';
import {
  badRequest,
  conflict,
  internalServerError,
} from '../../../utils/httpResponse';

type CircleRegisterEvent = {
  body?: string;
};

export class CircleRegisterController {
  private readonly circleRegisterService: CircleRegisterServiceInterface;

  constructor(props: {
    readonly circleRegisterService: CircleRegisterServiceInterface;
  }) {
    this.circleRegisterService = props.circleRegisterService;
  }

  async handle(event: CircleRegisterEvent): Promise<APIGatewayProxyResult> {
    if (event.body == null) {
      return badRequest('request body is null');
    }

    const body = JSON.parse(event.body);
    const circleName = body.circle_name;
    const ownerId = body.owner_id;

    if (typeof circleName !== 'string') {
      return badRequest('circle_name should be string type');
    }

    if (typeof ownerId !== 'string') {
      return badRequest('owner_id should be string type');
    }

    const command = new CircleRegisterCommand({ ownerId, circleName });
    const response = await this.circleRegisterService
      .handle(command)
      .catch((error: Error) => error);

    if (response instanceof Error) {
      const error = response;

      if (error instanceof CircleDuplicateApplicationError) {
        return conflict(`circle_name ${circleName} is already exist`);
      }
      return internalServerError({ message: 'circle register failed', error });
    }

    return {
      statusCode: 201,
      body: JSON.stringify({}),
      headers: { location: `${rootURI}circles/${response.getCircleId()}` },
    };
  }
}

const bootstrap = new Bootstrap();
const rootURI = bootstrap.getRootURI();
const circleRegisterService = new CircleRegisterService({
  circleRepository: bootstrap.getCircleRepository(),
  userRepository: bootstrap.getUserRepository(),
  circleFactory: bootstrap.getCircleFactory(),
});
const circleRegisterController = new CircleRegisterController({
  circleRegisterService,
});

export const handle = async (event: CircleRegisterEvent) =>
  await circleRegisterController.handle(event);
