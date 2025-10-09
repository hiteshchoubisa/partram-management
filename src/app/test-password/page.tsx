"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PasswordInput from "@/components/ui/PasswordInput";

export default function TestPasswordPage() {
  const [email, setEmail] = useState("hitesh.choubisa123@gmail.com");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");

  const testPassword = async () => {
    try {
      // Get user data
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError || !userData) {
        setResult("User not found");
        return;
      }

      setResult(`Database hash: ${userData.password_hash}`);
      
      // Test direct comparison
      if (userData.password_hash === password) {
        setResult(prev => prev + "\n✅ Direct password match!");
        return;
      }

      // Test SHA-256 hash
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      setResult(prev => prev + `\nYour password hash: ${hashedPassword}`);
      
      if (userData.password_hash === hashedPassword) {
        setResult(prev => prev + "\n✅ SHA-256 hash match!");
      } else {
        setResult(prev => prev + "\n❌ No match found");
      }
    } catch (err) {
      setResult(`Error: ${err}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50  py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900  text-center">
            Password Test
          </h2>
          <p className="text-center text-sm text-gray-600 ">
            Test what password works for your admin account
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700  mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white  text-gray-900 "
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700  mb-1">
              Password to test
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white  text-gray-900 "
              placeholder="Enter password to test"
            />
          </div>
          
          <button
            onClick={testPassword}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Test Password
          </button>
          
          {result && (
            <div className="bg-gray-100  p-4 rounded-md">
              <pre className="text-sm text-gray-900  whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </div>
        
        <div className="text-center">
          <a href="/login" className="text-green-600 hover:text-green-500">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
