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
    // Load base layout
    const layoutPath = path.resolve(
      __dirname,
      '../templates/',
      'base-layout.template.html',
    );
    let layout = fs.readFileSync(layoutPath, 'utf-8');

    // Load content template (try with -content suffix first)
    const contentTemplateName = templatePath.replace('.template.html', '');
    const contentPath = path.resolve(
      __dirname,
      '../templates/',
      `${contentTemplateName}-content.template.html`,
    );

    // Check if content-only template exists, otherwise use full template
    let content: string;
    if (fs.existsSync(contentPath)) {
      // Use content-only template
      content = fs.readFileSync(contentPath, 'utf-8');
    } else {
      // Fallback to full template (for backward compatibility)
      const fullPath = path.resolve(__dirname, '../templates/', templatePath);
      return this.replaceVariables(
        fs.readFileSync(fullPath, 'utf-8'),
        replacements,
      );
    }

    // Replace variables in content first
    content = this.replaceVariables(content, replacements);

    // Inject content into layout
    layout = layout.replace('{{content}}', content);

    // Replace remaining variables in layout (like year, title, preheader)
    layout = this.replaceVariables(layout, {
      ...replacements,
      title: replacements.title || 'My Center Academy',
      preheader: replacements.preheader || 'Email de My Center Academy',
    });

    return layout;
  }

  private replaceVariables(
    template: string,
    replacements: Record<string, string>,
  ): string {
    let result = template;
    for (const key in replacements) {
      if (replacements.hasOwnProperty(key)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, replacements[key]);
      }
    }
    return result;
  }
}
