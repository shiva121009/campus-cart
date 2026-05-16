import "./PageHeader.css";

function PageHeader({ title, subtitle, kicker }) {
  return (
    <header className="page-header">
      {kicker && <p className="page-header-kicker">{kicker}</p>}
      <h1 className="page-header-title">{title}</h1>
      {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
    </header>
  );
}

export default PageHeader;
