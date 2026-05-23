import { auth } from "@clerk/nextjs/server";
import HistoryClient from "./HistoryClient";

export default async function HistoryPage() {
  const { getToken } = await auth();
  const token = await getToken();

  const res = await fetch(`${process.env.FASTAPI_URL}/history`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to load history");
  const sessions = await res.json();

  return (
    <div className="dashboard-page">
      <div className="dash-header">
        <div className="dash-header__left">
          <div className="dash-avatar">📋</div>
          <div>
            <p className="dash-greeting">Your past sessions</p>
            <h1 className="dash-title">Interview History</h1>
          </div>
        </div>
      </div>
      <HistoryClient sessions={sessions} />
    </div>
  );
}