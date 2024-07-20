import { AttributeValue } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'

export const marshallObject = (object: unknown): Record<string, AttributeValue> => {
  return marshall(object, {
    removeUndefinedValues: true,
  }) as unknown as Record<string, AttributeValue>
}