import "./AdminDashboardChart.css";

function AdminDashboardChart({ chart }) {
  if (!chart?.labels?.length) return null;

  const series = [
    { key: "listings", label: "Listings", className: "chart-bar--listings" },
    { key: "orders", label: "Orders", className: "chart-bar--orders" },
    {
      key: "verifications",
      label: "Verifications",
      className: "chart-bar--verifications",
    },
  ];

  const maxVal = Math.max(
    1,
    ...chart.labels.flatMap((_, i) =>
      series.map((s) => chart[s.key]?.[i] || 0)
    )
  );

  return (
    <section className="admin-chart-panel">
      <div className="admin-panel-head">
        <h2>Last 7 days</h2>
        <div className="admin-chart-legend">
          {series.map((s) => (
            <span key={s.key} className={`admin-chart-legend-item ${s.className}`}>
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="admin-chart-bars">
        {chart.labels.map((label, i) => (
          <div key={label} className="admin-chart-day">
            <div className="admin-chart-day-bars">
              {series.map((s) => {
                const val = chart[s.key]?.[i] || 0;
                const h = Math.round((val / maxVal) * 100);
                return (
                  <div
                    key={s.key}
                    className={`admin-chart-bar ${s.className}`}
                    style={{ height: `${Math.max(h, val > 0 ? 8 : 0)}%` }}
                    title={`${s.label}: ${val}`}
                  />
                );
              })}
            </div>
            <span className="admin-chart-day-label">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AdminDashboardChart;
