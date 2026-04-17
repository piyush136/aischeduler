const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    // If user provided custom SMTP in .env
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail', // Fallback to standard gmail, or host if needed
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      console.log('[EmailService] Using provided SMTP credentials.');
    } else {
      // Create a test account via Ethereal mail if no credentials provided
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
          },
        });
        console.log(`\n======================================================\n[EmailService] NO SMTP CREDENTIALS FOUND IN .env.\nCreated Ethereal Email test account: ${testAccount.user}\nAll outgoing emails will be caught and previewable.\n======================================================\n`);
      } catch (error) {
        console.error('[EmailService] Failed to create ethereal account:', error);
      }
    }
  }

  async sendTaskReminderEmail(toEmail, userName, task) {
    if (!this.transporter) {
      console.log('[EmailService] Transporter not initialized. Cannot send email.');
      return false;
    }

    try {
      const formattedTime = new Date(task.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const info = await this.transporter.sendMail({
        from: '"AI Scheduler" <noreply@aischeduler.com>',
        to: toEmail,
        subject: `Reminder: ${task.title} is starting soon!`,
        text: `Hi ${userName},\n\nJust a quick reminder that your task "${task.title}" is scheduled to start at ${formattedTime}.\n\nAI Scheduler`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4F46E5;">Task Reminder</h2>
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Just a quick reminder that your upcoming task is starting soon:</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #111827;">${task.title}</h3>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Time:</strong> ${formattedTime}</p>
              ${task.description ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Details:</strong> ${task.description}</p>` : ''}
              ${task.location && task.location.name ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Location:</strong> ${task.location.name}</p>` : ''}
            </div>
            <p style="color: #6b7280; font-size: 0.9em;">- Your AI Scheduler Assistant</p>
          </div>
        `
      });

      console.log(`[EmailService] Reminder sent to ${toEmail}. Message ID: ${info.messageId}`);
      if (info.messageId && (!process.env.EMAIL_USER || process.env.EMAIL_USER === '')) {
        console.log(`[EmailService] => Preview this email here: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return true;
    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
