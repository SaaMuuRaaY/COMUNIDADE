import { YouTubeVideoEmbed } from "@/components/shared/youtube-video-embed";
import { settingBoolean, settingString } from "@/lib/config/settings";
import { getSettings } from "@/server/queries/settings";

/** Vídeo de boas-vindas do canal "Comece por aqui". Some quando desativado ou sem URL. */
export async function WelcomeVideo() {
  const map = await getSettings();
  if (!settingBoolean(map, "welcome_video.enabled")) return null;

  const url = settingString(map, "welcome_video.url");
  if (!url) return null;

  return (
    <YouTubeVideoEmbed
      url={url}
      title={settingString(map, "welcome_video.title") ?? "Vídeo de boas-vindas"}
    />
  );
}
