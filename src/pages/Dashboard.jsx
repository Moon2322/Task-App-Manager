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
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [groupForm] = Form.useForm();
  const [createdGroups, setCreatedGroups] = useState([]);

  useEffect(() => {
    fetchTasks();
    fetchUserGroups();
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
      if (response.status === 401 || result.message === "Token inválido o expirado")
        return handleTokenExpiration();
  
      if (!response.ok) {
        message.error("Error al obtener las tareas");
        throw new Error("Error al obtener las tareas");
      }
  
      setTasks(result);
    } catch (error) {
      console.error("Error:", error);
    }
  };
  

  const fetchUserGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return handleTokenExpiration();

      const response = await fetch("http://localhost:5000/user/groups", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (response.status === 401 || result.message === "Token inválido o expirado")
        return handleTokenExpiration();

      const userId = localStorage.getItem("userId");
      const filteredGroups = result.filter(
        (group) => group.creator && group.creator._id.toString() === userId
      );
      setCreatedGroups(filteredGroups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
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
      if (response.status === 401 || result.message === "Token inválido o expirado")
        return handleTokenExpiration();

      if (!response.ok) {
        message.error("Error al actualizar el estado de la tarea");
        throw new Error("Error al actualizar el estado de la tarea");
      }

      message.success("Estado de la tarea actualizado!");
      fetchTasks(); 
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const addTask = async (taskData) => {
    console.log("Valores del formulario:", taskData);
    try {
      const token = localStorage.getItem("token");
      if (!token) return handleTokenExpiration();
  
      let assignedEmails = [];
      if (taskData.assignedTo) {
        assignedEmails = taskData.assignedTo
          .split(",")
          .map(email => email.trim())
          .filter(email => email !== "");
      }
  
      const formattedData = {
        Nametask: taskData.Nametask,
        Description: taskData.Description,
        category: taskData.category,
        deadline: taskData.deadline,
        group: taskData.group, 
        assignedTo: assignedEmails 
      };
  
      const response = await fetch("http://localhost:5000/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formattedData),
      });
  
      const result = await response.json();
      if (response.status === 401 || result.message === "Token inválido o expirado")
        return handleTokenExpiration();
  
      if (!response.ok) {
        message.error("Error al crear la tarea");
        throw new Error("Error al crear la tarea");
      }
  
      message.success("Tarea creada exitosamente!");
      fetchTasks(); 
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error("Error:", error);
      message.error(error.message || "Error al crear la tarea");
    }
  };
  

  const createGroup = async (groupData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return handleTokenExpiration();
  
      const members = groupData.members
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email !== "");
  
      const formattedData = {
        name: groupData.groupName,
        description: groupData.description,
        members, 
      };
  
      const response = await fetch("http://localhost:5000/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formattedData),
      });
  
      const result = await response.json();
  
      if (response.status === 401 || result.message === "Token inválido o expirado")
        return handleTokenExpiration();
  
      if (!response.ok) {
        message.error(result.message || "Error al crear el grupo");
        throw new Error(result.message || "Error al crear el grupo");
      }
  
      message.success("Grupo creado exitosamente!");
      setIsGroupModalVisible(false);
      groupForm.resetFields();
      fetchUserGroups();
    } catch (error) {
      console.error("Error:", error);
      message.error(error.message || "Error al crear el grupo");
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
        
        <Button 
          type="primary" 
          onClick={() => setIsGroupModalVisible(true)}
          style={{ position: "fixed", bottom: "70px", right: "20px" }}
        >
          Crear Grupo
        </Button>
      </Card>

      <div className="tasks-grid">
        {Object.keys(groupedTasks).map((status) => (
          <div key={status}>
            <Title level={3}>{getStatusText(Number(status))}</Title>
            {groupedTasks[status].map((task) => (
              <Card key={task._id} className="task-card">
                <Title level={4} className="task-title">{task.Nametask}</Title>
                <Paragraph className={`task-status ${getStatusClass(task.status)}`}>
                  Estado: {getStatusText(task.status)}
                </Paragraph>
                <Select 
                  value={task.status}
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

      <Modal
        title="Agregar Tarea"
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical" onFinish={addTask}>
          <Form.Item
            name="Nametask"
            label="Nombre de la Tarea"
            rules={[{ required: true, message: "El nombre de la tarea es obligatorio" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="Description" label="Descripción">
            <Input.TextArea />
          </Form.Item>
          <Form.Item
            name="category"
            label="Categoría"
            rules={[{ required: true, message: "La categoría es obligatoria" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="deadline"
            label="Fecha Límite"
            rules={[{ required: true, message: "La fecha límite es obligatoria" }]}
          >
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" />
          </Form.Item>
          <Form.Item name="group" label="Grupo (opcional)">
            <Select placeholder="Seleccione un grupo">
              {createdGroups.map((group) => (
                <Option key={group._id} value={group._id}>
                  {group.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="assignedTo"
            label="Asignar a (opcional)"
            rules={[
              {
              validator: (_, value) => {
                if (!value || value.trim() === "") {
                  return Promise.resolve();
                }

                const emails = value.split(",").map((email) => email.trim());
                const isValid = emails.every((email) =>
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                );

                return isValid
                  ? Promise.resolve()
                  : Promise.reject(new Error("Ingresa emails válidos separados por comas"));
              },
            },
          ]}
          >
            <Input placeholder="Ingresa los emails separados por comas" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Crear Grupo"
        open={isGroupModalVisible}
        onOk={() => groupForm.submit()}
        onCancel={() => setIsGroupModalVisible(false)}
      >
        <Form form={groupForm} layout="vertical" onFinish={createGroup}>
          <Form.Item name="groupName" label="Nombre del Grupo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea />
          </Form.Item>
          <Form.Item
            name="members"
            label="Miembros"
            rules={[
              { required: true, message: "Debes ingresar al menos un email" },
              {
                validator: (_, value) => {
                  const emails = value.split(",").map((email) => email.trim());
                  const isValid = emails.every((email) =>
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                  );
                  return isValid
                    ? Promise.resolve()
                    : Promise.reject(new Error("Ingresa emails válidos separados por comas"));
                },
              },
            ]}
          >
            <Input placeholder="Ingresa los emails separados por comas" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard;
