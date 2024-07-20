import { Logger } from '@aws-lambda-powertools/logger'
import { DynamoDBClient, GetItemCommand, paginateScan, PutItemCommand, ScanCommandInput } from '@aws-sdk/client-dynamodb'
import { convertToAttr, unmarshall } from '@aws-sdk/util-dynamodb'
import { generateId } from './utils/generateId'
import { getMandatoryEnv } from './utils/getMandatoryEnv'
import { marshallObject } from './utils/marshallObject'

const dynamoDb = new DynamoDBClient()

export class ProfileService {
  private readonly logger: Logger = new Logger({ serviceName: 'ProfileService' })
  private readonly tableName = getMandatoryEnv('DATA_TABLE_NAME')

  constructor() {
    this.logger.debug('Loading ProfileService')
  }

  listAllProfiles = async (): Promise<Profile[]> => {
    const command: ScanCommandInput = {
      TableName: this.tableName,
    }
    const response: Profile[] = []
    const paginator = paginateScan({
      client: dynamoDb,
      pageSize: 100,
    }, command)

    for await (const page of paginator) {
      const items = page.Items
        ?.map(it => unmarshall(it) as Profile)
        || []
      response.push(...items)
    }
    return response
  }

  getProfile = async (sub: string): Promise<Profile | undefined> => {
    this.logger.info(`requesting user ${sub}`)
    const getCommand = new GetItemCommand({
      Key: {
        key: convertToAttr('profile'),
        sort: convertToAttr(sub),
      },
      TableName: this.tableName,
    })
    const existingUser = await dynamoDb.send(getCommand)
    if (!existingUser?.Item) {
      return
    }
    return unmarshall(existingUser.Item) as Profile
  }

  createProfile = async ({ sub, name, email, picture }: CreateProfileRequest) => {
    const id = generateId()
    const profile: Profile = {
      id,
      sub: sub,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      email: email,
      name: name,
      picture: picture,
      displayName: name,
    }
    await this.createProfileInDynamoDb(profile)
  }

  createProfileInDynamoDb = async (profile: Profile) => {
    try {
      const createCommand = new PutItemCommand({
        Item: marshallObject({
          ...profile,
          key: 'profile',
          sort: profile.sub,
          gsi: 'profile',
          gsiSort: profile.id,
        }),
        TableName: this.tableName,
      })
      await dynamoDb.send(createCommand)
      this.logger.info(`created user ${profile.sub} (${profile.id}) in dynamodb`)
    } catch (e) {
      const message = `Failed to create user ${profile.sub} in dynamodb`
      this.logger.error(message, { error: e })
      throw new Error(message)
    }
  }
}

export type CreateProfileRequest = {
  username: string;
  sub: string;
  name: string;
  email: string;
  picture?: string;
  poolId: string;
}

export interface Profile {
  id: string;
  sub: string;
  displayName: string;
  name: string;
  email: string;
  created: string;
  picture?: string;
  updated: string;
}
