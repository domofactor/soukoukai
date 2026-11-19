import Link from "next/link";

export default function Sent() {
  return <main id="main" className="narrow-page"><div className="eyebrow">CHECK YOUR INBOX</div><h1>Your sign-in link is on its way.</h1><p>Open the email on this device to continue. The link can be used once and expires in 15 minutes. Check your spam folder if it doesn&apos;t arrive.</p><Link className="button outline" href="/signin">Back to sign in</Link></main>;
}
