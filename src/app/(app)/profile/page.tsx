import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LevelBadge } from "@/components/shared/level-badge";
import { RoleBadge } from "@/components/shared/role-badge";
import { SocialLinks } from "@/components/shared/social-links";
import { ProfileForm } from "./profile-form";
import { SectionBanner } from "@/components/shared/section-banner";
import { SECTION_BANNERS } from "@/lib/section-banners";
import { requireProfile } from "@/lib/auth/current-user";

export const metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <SectionBanner {...SECTION_BANNERS.profile} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserAvatar name={profile.full_name} src={profile.avatar_url} className="h-14 w-14" />
            <div className="space-y-1">
              <CardTitle>{profile.full_name ?? "Membro"}</CardTitle>
              <div className="flex items-center gap-2">
                <LevelBadge level={profile.level} />
                <RoleBadge role={profile.role} />
                <span className="text-sm text-muted-foreground">{profile.points} pontos</span>
              </div>
              <SocialLinks links={profile.social_links} className="pt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
