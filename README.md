# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Email OTP Verification with EmailJS

This application uses EmailJS for OTP (One-Time Password) verification. Follow these steps to set up EmailJS for your project:

### 1. Create an EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com/) and sign up for an account
2. After signing in, navigate to the dashboard

### 2. Set up an Email Service

1. In the EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose an email provider (Gmail, Outlook, etc.)
4. Follow the instructions to connect your email account

### 3. Create an Email Template

1. Go to "Email Templates" in the dashboard
2. Click "Create New Template"
3. In your template design, make sure to include the following:
   - Set **To Email** field: `{{to_email}}` (IMPORTANT: Must be in the template configuration for recipient)
   - Use these exact variable names in your template:
     ```
     {{to_email}} - The recipient's email address (required)
     {{otp_code}} or {{otp}} or {{code}} or {{verification_code}} - The 6-digit verification code
     {{app_name}} - The name of your application 
     {{from_name}} - Sender name
     {{subject}} - Email subject line
     {{message}} - Full message with OTP code
     ```

4. **IMPORTANT: Template HTML Content**
   
   For the OTP code to display correctly, use this exact HTML content in your template:

   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Email Verification</title>
   </head>
   <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333;">
     <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
       <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
         <h1 style="color: white; margin: 0;">{{app_name}}</h1>
       </div>
       <div style="padding: 30px; text-align: center;">
         <h2>Email Verification</h2>
         <p>Hello,</p>
         <p>Thank you for registering. To verify your email address, please use the following code:</p>
         <div style="font-size: 32px; font-weight: bold; margin: 30px 0; padding: 15px; background-color: #f8f8f8; border-radius: 8px; letter-spacing: 5px;">
           {{otp_code}}
         </div>
         <p style="color: #777; font-size: 14px;">This code will expire in 15 minutes.</p>
         <p>If you did not request this code, please ignore this email.</p>
       </div>
       <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777;">
         <p>&copy; {{app_name}} - All rights reserved</p>
       </div>
     </div>
   </body>
   </html>
   ```

5. **Testing Your Template**:
   - After creating your template, click "Test" in the EmailJS dashboard
   - In the test form, make sure to set all the template variables:
     - to_email: your test email address
     - otp_code: 123456
     - app_name: Nook Food Ordering
     - from_name: Nook Food Ordering
   - Send the test email to verify it displays correctly

### 4. Configure Environment Variables

Update the `.env` file with your EmailJS credentials:

```
EXPO_PUBLIC_EMAILJS_SERVICE_ID=service_6aipiwl
EXPO_PUBLIC_EMAILJS_TEMPLATE_ID=template_8bg6o08
EXPO_PUBLIC_EMAILJS_PUBLIC_KEY=4PTJpGlpUN1X8xAh3
```

### 5. Testing the OTP System

Use the test screen at `/emailjs-test` to verify your integration:
1. Navigate to the test screen
2. Enter your email address
3. Click "Send Test Email" to verify basic EmailJS functionality
4. Click "Test OTP Flow" to test the full OTP verification process

If your emails still don't show the OTP code correctly:
- Check your browser console for detailed logs
- Visit your EmailJS dashboard to see if there are any errors
- Make sure your template exactly matches the HTML provided above
