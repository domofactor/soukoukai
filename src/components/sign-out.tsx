"use client";

import { signOut } from "next-auth/react";

export function SignOut() {
  return <button className="text-button" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>;
}
