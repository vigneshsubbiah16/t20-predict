import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
      <div className="text-center px-4">
        <p className="text-6xl font-black text-muted-foreground/30 mb-4">404</p>
        <h1 className="text-2xl font-black mb-2">That&apos;s a wide!</h1>
        <p className="text-muted-foreground mb-6">
          This page doesn&apos;t exist. Maybe it was bowled out.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <Button>Home</Button>
          </Link>
          <Link href="/matches">
            <Button variant="outline">All Matches</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
