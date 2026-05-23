import { auth } from "@clerk/nextjs/server";
import DashboardClient from "./DashboardClient";

export default async function Dashboard() {
  const { getToken } = await auth();
  const token = await getToken();

  const res = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`FastAPI returned ${res.status}`);
  const user = await res.json();

  const initial = user.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <div className="dashboard-page">
      <div className="dash-header">
        <div className="dash-header__left">
          <div className="dash-avatar">{initial}</div>
          <div>
            <p className="dash-greeting">Good to see you back 👋</p>
            <h1 className="dash-title">{user.email}</h1>
          </div>
        </div>
        <div className="dash-header__stats">
          <div className="dash-stat">
            <span className="dash-stat__value">AI</span>
            <span className="dash-stat__label">Powered</span>
          </div>
          <div className="dash-stat-divider" />
          <div className="dash-stat">
            <span className="dash-stat__value">∞</span>
            <span className="dash-stat__label">Interviews</span>
          </div>
          <div className="dash-stat-divider" />
          <div className="dash-stat">
            <span className="dash-stat__value">Live</span>
            <span className="dash-stat__label">Voice</span>
          </div>
        </div>
      </div>

      <DashboardClient />
    </div>
  );
}