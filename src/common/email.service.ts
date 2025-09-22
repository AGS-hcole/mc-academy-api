import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter;

  /**
   * Constructor
   */
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.M365_EMAIL,
        pass: process.env.M365_EMAIL_PASSWORD,
      },
    });
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
    // Load the template and set the replacement variables
    const htmlTemplate = await this.loadEmailTemplate(
      `${template}.template.html`,
      replacements,
    );

    // Email settings
    const mailOptions = {
      from: process.env.M365_EMAIL,
      to: to,
      cc: cc,
      subject: subject,
      html: htmlTemplate,
    };

    // Seznd the email accordingly
    await this.transporter.sendMail(mailOptions);
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
