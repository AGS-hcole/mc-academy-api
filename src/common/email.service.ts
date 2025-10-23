import { Injectable, Logger } from '@nestjs/common';
import * as Brevo from '@getbrevo/brevo';
import * as fs from 'fs';
import * as path from 'path';

// Extend TransactionalEmailsApi to access protected authentications
class BrevoEmailApi extends Brevo.TransactionalEmailsApi {
  configureApiKey(apiKey: string) {
    this.authentications.apiKey.apiKey = apiKey;
  }
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private apiInstance: BrevoEmailApi;

  /**
   * Constructor
   */
  constructor() {
    // Initialize Brevo API
    this.apiInstance = new BrevoEmailApi();
    this.apiInstance.configureApiKey(process.env.BREVO_API_KEY || '');
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------
  async sendTemplateEmail(
    to: string,
    cc: string,
    subject: string,
    template: string,
    replacements: Record<string, string>,
  ) {
    try {
      // Load the template and set the replacement variables
      const htmlTemplate = await this.loadEmailTemplate(
        `${template}.template.html`,
        replacements,
      );

      // Prepare sender
      const sender = {
        email: process.env.BREVO_SENDER_EMAIL || process.env.M365_EMAIL || '',
        name: process.env.BREVO_SENDER_NAME || 'MyCenter Academy',
      };

      // Prepare recipient
      const toRecipients = [{ email: to }];

      // Prepare CC recipients if provided
      const ccRecipients = cc ? [{ email: cc }] : undefined;

      // Create email object
      const sendSmtpEmail = new Brevo.SendSmtpEmail();
      sendSmtpEmail.sender = sender;
      sendSmtpEmail.to = toRecipients;
      sendSmtpEmail.cc = ccRecipients;
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = htmlTemplate;

      // Send the email
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`Email sent successfully to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${error?.message ?? error}`,
      );
      throw error;
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------
  private async loadEmailTemplate(
    templatePath: string,
    replacements: Record<string, string>,
  ): Promise<string> {
    // Read the template HTML file
    const filePath = path.resolve(__dirname, '../templates/', templatePath);
    let template = fs.readFileSync(filePath, 'utf-8');

    // Replace the placeholders
    for (const key in replacements) {
      if (replacements.hasOwnProperty(key)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, replacements[key]);
      }
    }

    return template;
  }
}
