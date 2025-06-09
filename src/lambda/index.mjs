import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ 
  region: 'eu-central-1',
  // Explicitly set configuration options to avoid inheriting any defaults
  apiVersion: '2010-12-01'
});

const emailTo = 'info@ai-marketplace.fi';

const welcomeText = `Uusi AI palvelu lisätty`;

export const handler = async (event) => {
  return await Promise.all(
    event.Records.map(async (record) => {
      if (record.eventName !== 'INSERT') {
        return;
      }
      if (!record.dynamodb) {
        return;
      }
      if (!record.dynamodb.NewImage) {
        return;
      }
      const params = {
        Destination: {
          ToAddresses: [emailTo]
        },
        Message: {
          Subject: {
            Data: 'Uusi AI palvelu'
          },
          Body: {
            Text: {
              Charset: 'UTF-8',
              Data: welcomeText
            }
          }
        },
        Source: 'AI Marketplace Finland <info@ai-marketplace.fi>'
      };

      const command = new SendEmailCommand(params);
      return await ses.send(command);
    })
  );
};