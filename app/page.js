import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <p>This is the root page "/".</p>
        <ul className="mt-6 text-left list-disc list-inside">
          <li><Link href="/account-management" className="text-blue-400 hover:underline">Account Management</Link></li>
          <li><Link href="/chat" className="text-blue-400 hover:underline">Chat</Link></li>
          <li><Link href="/payment-and-donation" className="text-blue-400 hover:underline">Payment and Donation</Link></li>
          <li><Link href="/rating" className="text-blue-400 hover:underline">Rating</Link></li>
          <li><Link href="/scheduling" className="text-blue-400 hover:underline">Scheduling</Link></li>
        </ul>
      </div>
    </div>
  );
}
