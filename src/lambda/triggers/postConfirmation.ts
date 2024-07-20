import { PostConfirmationTriggerEvent } from 'aws-lambda'
import { ProfileService } from '../ProfileService'

const profileService = new ProfileService()

export const handler = async (event: PostConfirmationTriggerEvent): Promise<PostConfirmationTriggerEvent> => {
  await profileService.createProfile({
    sub: event.request.userAttributes.sub!,
    email: event.request.userAttributes.email!,
    name: event.request.userAttributes.given_name!,
    picture: event.request.userAttributes.picture,
    username: event.userName,
    poolId: event.userPoolId,
  })
  return event
}