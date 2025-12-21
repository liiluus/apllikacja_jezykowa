import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div style={{ maxWidth: 700, margin: "40px auto" }}>
      <h2>Dashboard</h2>
      <p>Wybierz, co chcesz zrobić:</p>

      <ul>
        <li><Link to="/exercise">➡️ Rozpocznij ćwiczenia</Link></li>
        <li><Link to="/progress">📊 Zobacz postęp</Link></li>
      </ul>
    </div>
  );
}
