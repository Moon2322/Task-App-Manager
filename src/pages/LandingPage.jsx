import { Button, Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import './../Css/LandingPage.css';

const { Title, Paragraph } = Typography;

const LandingPage = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/LoginPage');
  };

  return (
    <div className="landing-container">
      <Card className="landing-card">
        <Title level={2} className="landing-title">¡Bienvenido!</Title>
        <Paragraph className="landing-text">
          Gracias por visitar nuestra aplicación.
        </Paragraph>
        <Button type="primary" size="large" onClick={handleLoginClick} className="landing-button">
          Ir al Login
        </Button>
      </Card>
    </div>
  );
};

export default LandingPage;
