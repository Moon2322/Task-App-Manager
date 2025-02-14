import { Card, Typography } from "antd";
import "./../Css/Dashboard.css";

const { Title, Paragraph } = Typography;

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <Card className="dashboard-card">
        <Title level={2}>Bienvenido al Dashboard</Title>
        <Paragraph>Aquí encontrarás un resumen de tu actividad.</Paragraph>
      </Card>
    </div>
  );
};

export default Dashboard;
