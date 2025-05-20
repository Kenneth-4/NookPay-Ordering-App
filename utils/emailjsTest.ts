import emailjs from '@emailjs/browser';

// EmailJS configuration from environment variables
const EMAILJS_SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID || 'service_6aipiwl';
const EMAILJS_TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_8bg6o08';
const EMAILJS_PUBLIC_KEY = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY || '4PTJpGlpUN1X8xAh3';

/**
 * Test function to verify EmailJS configuration
 * @param testEmail The email address to send a test message to
 * @returns Promise that resolves when the email is sent
 */
export const testEmailJSConfiguration = async (testEmail: string): Promise<any> => {
  console.log('Testing EmailJS with the following configuration:');
  console.log('Service ID:', EMAILJS_SERVICE_ID);
  console.log('Template ID:', EMAILJS_TEMPLATE_ID);
  console.log('Public Key:', EMAILJS_PUBLIC_KEY);
  console.log('Test Email:', testEmail);
  
  try {
    // Verify email format
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      throw new Error('Invalid email format');
    }
    
    // Template parameters for test email
    const templateParams = {
      to_email: testEmail,
      recipient: testEmail,
      email: testEmail,
      to_name: "Test User",
      otp_code: "123456",
      otp: "123456",
      code: "123456",
      verification_code: "123456",
      verification: "123456",
      app_name: 'Nook Food Ordering',
      from_name: 'Nook Food Ordering',
      subject: 'Test Email',
      message: 'This is a test verification code: 123456. If you received this, your EmailJS configuration is working!',
      html_message: `<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h2>Test Email Verification</h2>
        <p>Your test verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; margin: 20px; padding: 10px; background-color: #f8f8f8; border-radius: 5px;">123456</div>
        <p>This is a test email to verify your EmailJS configuration.</p>
        <p>If your configuration is correct, you should see this formatted message with the code displayed prominently.</p>
      </div>`
    };
    
    // Send the test email
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    
    console.log('Test email sent successfully:', response);
    return {
      success: true,
      response
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    return {
      success: false,
      error
    };
  }
}; 