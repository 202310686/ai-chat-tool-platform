import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ChatApp from "@/components/chat-app";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  return <ChatApp email={session.user.email} />;
}

