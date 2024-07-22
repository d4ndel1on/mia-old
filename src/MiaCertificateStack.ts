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
   * Cname for the domains, that the certificate should serve
   */
  cnames: Array<string>;
}

export class MiaCertificateStack extends MiaTaggedStack {
  readonly certificate: Certificate
  readonly zone: IHostedZone

  constructor(scope: Construct, id: string, props: MiaCertificateStackProps) {
    super(scope, id, props)

    const { domain, cnames } = props

    if (this.region !== 'us-east-1') {
      throw new Error(
        'Cloudfront certificates must be in the `us-east-1` region.\n Read more here: ' +
        'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html',
      )
    }

    if (!cnames || !cnames.length) {
      throw new Error('No cnames provided')
    }

    this.zone = PublicHostedZone.fromLookup(this, 'Zone', { domainName: domain })
    this.certificate = new Certificate(this, 'Cert', {
      domainName: `*.${cnames[0]}.${domain}`,
      subjectAlternativeNames: cnames.flatMap(c => [`${c}.${domain}`, `*.${c}.${domain}`]),
      validation: CertificateValidation.fromDns(this.zone),
    })
  }
}
