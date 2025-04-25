import nodemailer from 'nodemailer';

// This would be configured with actual SMTP settings in production
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'alerts@example.com',
    pass: process.env.SMTP_PASS || 'password'
  }
});

export const AlertService = {
  async sendNodeDownAlert(nodeType: string, details: any) {
    const mailOptions = {
      from: process.env.ALERT_FROM_EMAIL || 'alerts@example.com',
      to: process.env.ALERT_TO_EMAIL || 'admin@example.com',
      subject: `[ALERT] Hyperlane ${nodeType} is DOWN`,
      text: `
        The Hyperlane ${nodeType} is currently down.
        
        Details:
        ${JSON.stringify(details, null, 2)}
        
        Please check the system immediately.
      `,
      html: `
        <h2>Hyperlane ${nodeType} Alert</h2>
        <p>The Hyperlane ${nodeType} is currently <strong style="color: red;">DOWN</strong>.</p>
        
        <h3>Details:</h3>
        <pre>${JSON.stringify(details, null, 2)}</pre>
        
        <p>Please check the system immediately.</p>
      `
    };
    
    try {
      // In development, we'll just log the alert instead of sending an email
      if (process.env.NODE_ENV === 'development') {
        console.log('ALERT: Would send email with the following content:');
        console.log(mailOptions);
        return true;
      }
      
      await transporter.sendMail(mailOptions);
      console.log(`Alert sent for ${nodeType} down`);
      return true;
    } catch (error) {
      console.error('Error sending alert:', error);
      return false;
    }
  },
  
  async sendResourceWarningAlert(nodeType: string, resource: string, value: number, threshold: number) {
    const mailOptions = {
      from: process.env.ALERT_FROM_EMAIL || 'alerts@example.com',
      to: process.env.ALERT_TO_EMAIL || 'admin@example.com',
      subject: `[WARNING] Hyperlane ${nodeType} ${resource} usage high`,
      text: `
        The Hyperlane ${nodeType} has high ${resource} usage.
        
        Current value: ${value}
        Threshold: ${threshold}
        
        Please investigate.
      `,
      html: `
        <h2>Hyperlane ${nodeType} Warning</h2>
        <p>The Hyperlane ${nodeType} has high <strong>${resource}</strong> usage.</p>
        
        <p>Current value: <strong>${value}</strong></p>
        <p>Threshold: ${threshold}</p>
        
        <p>Please investigate.</p>
      `
    };
    
    try {
      // In development, we'll just log the alert instead of sending an email
      if (process.env.NODE_ENV === 'development') {
        console.log('WARNING: Would send email with the following content:');
        console.log(mailOptions);
        return true;
      }
      
      await transporter.sendMail(mailOptions);
      console.log(`Warning alert sent for ${nodeType} ${resource} usage`);
      return true;
    } catch (error) {
      console.error('Error sending alert:', error);
      return false;
    }
  }
};
