import { redirect } from "next/navigation";
import { currentUser } from "@/lib/current-user";
import { AccountShell } from "@/components/auth/AccountShell";
import { ProfileForm } from "@/components/auth/ProfileForm";

export const metadata = { title: "Мой профиль · ASTANA 2028" };
export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <AccountShell><ProfileForm user={user} /></AccountShell>;
}
