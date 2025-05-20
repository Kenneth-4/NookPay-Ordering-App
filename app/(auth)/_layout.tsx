import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="sign-in" 
        options={{ 
          headerShown: false,
          title: "Sign In"
        }} 
      />
      <Stack.Screen 
        name="sign-up" 
        options={{ 
          headerShown: false,
          title: "Sign Up"
        }} 
      />
      <Stack.Screen 
        name="forgot-password" 
        options={{ 
          headerShown: false,
          title: "Forgot Password"
        }} 
      />
      <Stack.Screen 
        name="verify-email" 
        options={{ 
          headerShown: false,
          title: "Verify OTP"
        }} 
      />
      <Stack.Screen 
        name="verify-otp" 
        options={{ 
          headerShown: false,
          title: "Verify OTP"
        }} 
      />
    </Stack>
  );
}
