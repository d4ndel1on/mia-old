import { StackProps } from 'aws-cdk-lib'
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager'
import { IHostedZone, PublicHostedZone } from 'aws-cdk-lib/aws-route53'
import { Construct } from 'constructs'
import { MiaTaggedStack } from './MiaTaggedStack'

/**
 * Properties of the MiaCertificateStack
 */
export interface MiaCertificateStackProps extends StackProps {
  /**
   * Domain name of the already existing hosted zone
   */
  domain: string;
  /**
   * Cname for the domain that the certificate should serve
   */
  cname: string;
}

export class MiaCertificateStack extends MiaTaggedStack {
  readonly certificate: Certificate
  readonly zone: IHostedZone
  readonly cname: string

  constructor(scope: Construct, id: string, props: MiaCertificateStackProps) {
    super(scope, id, props)

    const { domain, cname } = props
    this.cname = cname

    if (this.region !== 'us-east-1') {
      throw new Error(
        'Cloudfront certificates must be in the `us-east-1` region.\n Read more here: ' +
        'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html',
      )
    }

    this.zone = PublicHostedZone.fromLookup(this, 'Zone', { domainName: domain })
    this.certificate = new Certificate(this, 'Cert', {
      domainName: `${cname}.${domain}`,
      subjectAlternativeNames: [`*.${cname}.${domain}`],
      validation: CertificateValidation.fromDns(this.zone),
    })
  }
}
