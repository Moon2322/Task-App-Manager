import { Card, Form, Input, Button, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import './../Css/LoginPage.css';

const { Title } = Typography;

const validUsers = [
  { username: "user", password: "user123" }
];

const LoginPage = () => {
  const navigate = useNavigate();

  const onFinish = (values) => {
    const userExists = validUsers.some(
      (user) => user.username === values.username && user.password === values.password
    );

    if (userExists) {
      message.success("Inicio de sesión exitoso!");
      navigate("/dashboard"); 
      message.error("Usuario o contraseña incorrectos.");
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={2} className="login-title">Iniciar Sesión</Title>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            label="Usuario"
            name="username"
            rules={[{ required: true, message: 'Por favor ingresa tu usuario' }]}
          >
            <Input className="login-input" />
          </Form.Item>
          <Form.Item
            label="Contraseña"
            name="password"
            rules={[{ required: true, message: 'Por favor ingresa tu contraseña' }]}
          >
            <Input.Password className="login-input" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block className="login-button">
              Ingresar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
