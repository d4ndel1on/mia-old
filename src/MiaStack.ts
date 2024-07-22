import { StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { MiaTaggedStack } from './MiaTaggedStack'
import { MiaUserManagement, MiaUserManagementProps } from './MiaUserManagement'

/**
 * Properties of the MiaStack
 */
export interface MiaStackProps extends MiaUserManagementProps, StackProps {
}

export class MiaStack extends MiaTaggedStack {
  readonly userManagement: MiaUserManagement

  constructor(scope: Construct, id: string, props: MiaStackProps) {
    super(scope, id, {
      ...props,
      crossRegionReferences: props.crossRegionReferences ? true : props.env?.region !== 'us-east-1',
    })

    this.userManagement = new MiaUserManagement(this, id, props)
  }
}
