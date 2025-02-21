import { Card, Form, Input, Button, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { isEmail } from 'validator'; 
import './../Css/LoginPage.css';

const { Title, Text } = Typography;

const RegisterPage = () => {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    const { username, email, password } = values;

    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        message.success(data.message);
        navigate("/LoginPage");
      } else {
        message.error(data.message);
      }
    } catch (error) {
      message.error("Error al registrar la cuenta", error);
    }
  };

  const goToLogin = () => {
    navigate("/LoginPage");
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={2} className="login-title">Crear cuenta</Title>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            label="Usuario"
            name="username"
            rules={[{ required: true, message: 'Por favor ingresa tu usuario' }]}
          >
            <Input className="login-input" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Por favor ingresa tu email' },
              {
                validator: (_, value) => {
                  if (isEmail(value)) {
                    return Promise.resolve();
                  }
                  return Promise.reject('Por favor ingresa un email válido');
                },
              },
            ]}
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
              Crear cuenta
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text>
            ¿Ya tienes una cuenta?{' '}
            <a onClick={goToLogin} style={{ cursor: 'pointer', color: '#1890ff' }}>
              Inicia sesión aquí
            </a>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;