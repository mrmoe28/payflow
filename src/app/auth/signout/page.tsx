"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignOutPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    const handleSignOut = async () => {
      await signOut({ 
        redirect: false,
        callbackUrl: "/"
      });
      router.push("/");
    };

    if (session) {
      handleSignOut();
    } else {
      // If no session, redirect to home
      router.push("/");
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="animate-spin h-8 w-8 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Signing you out...</h2>
          <p className="text-gray-600">
            Please wait while we securely sign you out of your account.
          </p>
        </div>
      </div>
    </div>
  );
}