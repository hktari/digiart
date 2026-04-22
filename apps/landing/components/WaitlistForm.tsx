"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/Button";
import { trackWaitlistSignup } from "@/lib/analytics";

interface WaitlistFormProps {
  audience: "creator" | "collector";
  onSuccess: () => void;
}

export function WaitlistForm({ audience, onSuccess }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, audience }),
      });

      const data = await response.json();

      if (data.success) {
        setEmail("");
        trackWaitlistSignup(audience);
        onSuccess();
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <motion.input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          whileFocus={{
            scale: 1.02,
            borderColor: "rgba(220, 38, 38, 0.5)",
          }}
          className="flex-1 px-4 py-3 border-2 border-ink/20 focus:border-vermilion focus:outline-none transition-all bg-paper rounded-lg"
        />
        <Button
          type="submit"
          disabled={isLoading}
          className="whitespace-nowrap hover:scale-105 active:scale-95 transition-transform"
        >
          {isLoading ? "Joining..." : "Join Waitlist"}
        </Button>
      </div>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{
          opacity: error ? 1 : 0,
          height: error ? "auto" : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        {error && <p className="mt-2 text-sm text-vermilion">{error}</p>}
      </motion.div>
    </motion.form>
  );
}
