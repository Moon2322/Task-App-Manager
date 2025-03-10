import { Card, Form, Input, Button, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import './../Css/LoginPage.css';

const { Title, Text } = Typography;

const LoginPage = () => {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    const { username, password } = values;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardar el token en localStorage
        localStorage.setItem('token', data.token);

        message.success(data.message);
        navigate("/dashboard");
      } else {
        message.error(data.message || "Error al iniciar sesión");
      }
    } catch (error) {
      console.log("Error con el login", error);
      message.error("Error al conectar con el servidor");
    }
  };

  const handleRegisterClick = () => {
    navigate('/Registerpage');
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
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text>
            ¿Todavía no tienes una cuenta?{' '}
            <a onClick={handleRegisterClick} style={{ cursor: 'pointer', color: '#1890ff' }}>
              Crea una cuenta aquí
            </a>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;