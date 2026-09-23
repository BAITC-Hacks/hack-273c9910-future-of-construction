import { redirect } from "next/navigation";
import { currentUser } from "@/lib/current-user";
import { AccountShell } from "@/components/auth/AccountShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Регистрация · ASTANA 2028" };
export default async function RegisterPage() {
  if (await currentUser()) redirect("/profile");
  return <AccountShell><AuthForm mode="register" /></AccountShell>;
}
