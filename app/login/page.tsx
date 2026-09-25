import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.email) redirect("/");
  return <LoginForm requiresInviteCode={Boolean(process.env.REGISTRATION_CODE)} />;
}

