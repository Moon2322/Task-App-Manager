import { useState, useEffect } from "react";
import { Card, Typography, Button, Modal, Form, Input, Select, DatePicker, message } from "antd";
import { useNavigate } from "react-router-dom"; 
import "./../Css/Dashboard.css";

const { Title, Paragraph } = Typography;
const { Option } = Select;

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleTokenExpiration = () => {
    message.error("Tu sesión ha expirado. Inicia sesión nuevamente.");
    localStorage.removeItem("token"); 
    setTimeout(() => navigate("/LoginPage"), 1000);
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return handleTokenExpiration();

      const response = await fetch("http://localhost:5000/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (response.status === 401 || result.message === "Token inválido o expirado") return handleTokenExpiration();

      if (!response.ok) {
        message.error("Error al obtener las tareas");
        throw new Error("Error al obtener las tareas");
      }

      setTasks(result);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const addTask = async (taskData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return handleTokenExpiration();

      const response = await fetch("http://localhost:5000/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, 
        },
        body: JSON.stringify(taskData),
      });

      const result = await response.json();
      if (response.status === 401 || result.message === "Token inválido o expirado") return handleTokenExpiration();

      if (!response.ok) {
        message.error("Error al crear la tarea");
        throw new Error("Error al crear la tarea");
      }

      message.success("Tarea creada exitosamente!");
      fetchTasks(); // 🔹 Actualizar lista de tareas después de agregar una nueva
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
        const token = localStorage.getItem("token");
        if (!token) return handleTokenExpiration();

        const response = await fetch(`http://localhost:5000/tasks/${taskId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await response.json();
        if (response.status === 401 || result.message === "Token inválido o expirado") return handleTokenExpiration();

        if (!response.ok) {
            message.error("Error al actualizar el estado de la tarea");
            throw new Error("Error al actualizar el estado de la tarea");
        }

        message.success("Estado de la tarea actualizado!");
        fetchTasks(); // 🔹 Actualizar lista de tareas después del cambio de estado
    } catch (error) {
        console.error("Error:", error);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 0: return "In Progress";
      case 1: return "Done";
      case 2: return "Paused";
      case 3: return "Revision";
      default: return "Unknown";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 0: return "in-progress";
      case 1: return "done";
      case 2: return "paused";
      case 3: return "revision";
      default: return "";
    }
  };

  // Agrupar tareas por estado
  const groupedTasks = tasks.reduce((acc, task) => {
    acc[task.status] = acc[task.status] || [];
    acc[task.status].push(task);
    return acc;
  }, {});

  return (
    <div className="dashboard-container">
      <Card className="dashboard-card">
        <Title level={2}>Bienvenido al Dashboard</Title>
        <Paragraph>Aquí encontrarás un resumen de tu actividad.</Paragraph>
        <Button 
          type="primary" 
          onClick={() => setIsModalVisible(true)} 
          style={{ position: "fixed", bottom: "20px", right: "20px" }}
        >
          Agregar Tarea
        </Button>
      </Card>

      <div className="tasks-grid">
        {Object.keys(groupedTasks).map((status) => (  // 🔹 Se itera sobre los estados correctamente
          <div key={status}>
            <Title level={3}>{getStatusText(Number(status))}</Title>
            {groupedTasks[status].map((task) => (
              <Card key={task._id} className="task-card">
                <Title level={4} className="task-title">{task.Nametask}</Title>
                <Paragraph className={`task-status ${getStatusClass(task.status)}`}>
                  Estado: {getStatusText(task.status)}
                </Paragraph>
                
                <Select 
                  value={task.status} // 🔹 Se usa `value` en lugar de `defaultValue` para cambios dinámicos
                  style={{ width: 120 }} 
                  onChange={(newStatus) => updateTaskStatus(task._id, newStatus)}
                >
                  <Option value={0}>In Progress</Option>
                  <Option value={1}>Done</Option>
                  <Option value={2}>Paused</Option>
                  <Option value={3}>Revision</Option>
                </Select>
              </Card>
            ))}
          </div>
        ))}
      </div>

      <Modal title="Agregar Tarea" open={isModalVisible} onOk={() => form.submit()} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical" onFinish={addTask}>
          <Form.Item name="Nametask" label="Nombre de la Tarea" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="Description" label="Descripción">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="category" label="Categoría" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
            <Select>
              <Option value={0}>In Progress</Option>
              <Option value={1}>Done</Option>
              <Option value={2}>Paused</Option>
              <Option value={3}>Revision</Option>
            </Select>
          </Form.Item>
          <Form.Item name="deadline" label="Fecha Límite" rules={[{ required: true }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard;
