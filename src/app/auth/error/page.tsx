"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "OAuthSignin":
        return {
          title: "OAuth Sign-in Error",
          description: "There was a problem signing in with your OAuth provider. Please try again.",
        };
      case "OAuthCallback":
        return {
          title: "OAuth Callback Error", 
          description: "There was a problem processing the OAuth callback. Please try signing in again.",
        };
      case "OAuthCreateAccount":
        return {
          title: "Account Creation Error",
          description: "Could not create your account with the OAuth provider. Please try again or contact support.",
        };
      case "EmailCreateAccount":
        return {
          title: "Email Account Error",
          description: "Could not create your account with email. Please try again or contact support.",
        };
      case "Callback":
        return {
          title: "Callback Error",
          description: "There was a problem with the authentication callback. Please try signing in again.",
        };
      case "OAuthAccountNotLinked":
        return {
          title: "Account Already Exists",
          description: "An account with this email already exists but is associated with a different sign-in method. Please sign in using your original method.",
        };
      case "EmailSignin":
        return {
          title: "Email Sign-in Error",
          description: "There was a problem sending the sign-in email. Please check your email address and try again.",
        };
      case "CredentialsSignin":
        return {
          title: "Invalid Credentials",
          description: "The credentials you provided are not valid. Please check your information and try again.",
        };
      case "SessionRequired":
        return {
          title: "Authentication Required",
          description: "You must be signed in to access that page. Please sign in and try again.",
        };
      case "AccessDenied":
        return {
          title: "Access Denied",
          description: "You do not have permission to access this resource. Please contact support if you believe this is an error.",
        };
      case "Verification":
        return {
          title: "Verification Error",
          description: "The verification token is invalid or has expired. Please request a new sign-in link.",
        };
      default:
        return {
          title: "Authentication Error",
          description: "An unexpected error occurred during authentication. Please try again.",
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.882 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{errorInfo.title}</h2>
          <p className="text-gray-600 mb-6">
            {errorInfo.description}
          </p>

          {error && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-gray-500 font-mono">
                Error code: {error}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Try Again
            </Link>
            
            <Link
              href="/"
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Go Home
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              If this problem persists, please{" "}
              <a 
                href="mailto:support@payflow.com" 
                className="text-blue-600 hover:text-blue-500"
              >
                contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="animate-spin h-8 w-8 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
            <p className="text-gray-600">Please wait</p>
          </div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}