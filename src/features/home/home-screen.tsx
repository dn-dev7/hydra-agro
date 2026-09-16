import { PropertyRoutine } from "./property-routine";
import { EasyHome, useEasyMode } from "../easy-mode/easy-mode";
"use client";

import { useEffect, useState } from "react";
import "../../product-polish.css";
import "./home-production-shortcut.css";
import "./home-profile-xp.css";
import "../climate/home-science-summary.css";
import type { Announcement, AppRoute, HydraAccount } from "../../lib/hydra-types";
import { refreshDailyBriefingCopy } from "../../services/daily-briefing";
import { syncMissionProgress } from "../../services/mission-progress";
import { requireSupabase } from "../../services/supabase";
import { NutriCicloPanel } from "../family-farming/nutriciclo-panel";

type Props = { updateAccount: import("../../lib/hydra-types").UpdateAccount; account: HydraAccount; navigate: (route: AppRoute) => void; onQuickAction: () => void; announcements: Announcement[] };

function welcomeMessage() { const hour = new Date().getHours(); if (hour < 5) return "Boa noite"; if (hour < 12) return "Bom dia"; if (hour < 18) return "Boa tarde"; return "Boa noite"; }

export function HomeScreen({ account, navigate, announcements, updateAccount }: Props) {
  const { enabled: easy } = useEasyMode();
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [nutriCicloOpen, setNutriCicloOpen] = useState(false);
  const firstName = account.profile.name.split(/\s+/)[0] || "Produtor";
  const welcome = welcomeMessage();
  const pendingActivities = account.activities.filter((activity) => !activity.done);
  const completedActivities = account.activities.length - pendingActivities.length;
  const identifiedAnimals = account.animals.filter((animal) => animal.electronicId).length;
  useEffect(() => {
    let active = true; const client = requireSupabase();
    async function refreshUnread() { const { count, error } = await client.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_user_id", account.id).is("read_at", null); if (active && !error) setHasUnreadNotifications((count ?? 0) > 0); }
    void refreshUnread();
    const channel = client.channel(`hydra-home-notifications-${account.id}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_user_id=eq.${account.id}` }, () => { void refreshUnread(); }).subscribe();
    return () => { active = false; void client.removeChannel(channel); };
  }, [account.id]);

  useEffect(() => { void refreshDailyBriefingCopy(account).catch(() => undefined); }, [account.id]);

  useEffect(() => {
    void syncMissionProgress().catch(() => undefined);
  }, [account.id, account.animals.length, identifiedAnimals, completedActivities, account.monitoring.length, account.waterRecords.length, account.nfcReadCount, account.property.name, account.property.municipality, account.property.mainActivity]);

  if (easy) return <EasyHome navigate={navigate} />;
  return <><PropertyRoutine account={account} navigate={navigate} announcements={announcements} updateAccount={updateAccount} greeting={`${welcome}, ${firstName}`} unread={hasUnreadNotifications} onNutriCiclo={() => setNutriCicloOpen(true)} /><NutriCicloPanel account={account} open={nutriCicloOpen} onClose={() => setNutriCicloOpen(false)} /></>;
}
