import { useState, useEffect } from "react";
import { Card, Typography, Button, List, message, Modal, Input } from "antd";
import { useNavigate } from "react-router-dom";
import "./../Css/Groupspage.css";

const { Title, Text } = Typography;

const GroupsPage = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [newMembers, setNewMembers] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserGroups();
  }, []);

  const fetchUserGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return handleTokenExpiration();

      const response = await fetch("http://localhost:5000/user/groups", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (response.status === 401 || result.message === "Token inválido o expirado") {
        return handleTokenExpiration();
      }

      if (!response.ok) {
        message.error("Error al obtener los grupos");
        throw new Error("Error al obtener los grupos");
      }

      setGroups(result);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      message.error("Error al cargar los grupos");
    }
  };

  const handleTokenExpiration = () => {
    message.error("Tu sesión ha expirado. Inicia sesión nuevamente.");
    localStorage.removeItem("token");
    setTimeout(() => navigate("/LoginPage"), 1000);
  };

  const handleOpenModal = (groupId) => {
    setSelectedGroupId(groupId);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setNewMembers("");
  };

  const handleAddMembers = async () => {
    if (!newMembers.trim()) {
      message.error("Ingresa al menos un correo electrónico.");
      return;
    }

    const emails = newMembers.split(",").map(email => email.trim());

    try {
      const token = localStorage.getItem("token");
      if (!token) return handleTokenExpiration();

      const response = await fetch(`http://localhost:5000/groups/${selectedGroupId}/add-members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emails }),
      });

      const result = await response.json();

      if (response.status === 401 || result.message === "Token inválido o expirado") {
        return handleTokenExpiration();
      }

      if (!response.ok) {
        message.error(result.message || "Error al agregar miembros");
        throw new Error(result.message || "Error al agregar miembros");
      }

      message.success("Miembros agregados exitosamente!");
      fetchUserGroups(); // Refrescar la lista de grupos
      handleCloseModal();
    } catch (error) {
      console.error("Error:", error);
      message.error("No se pudo agregar a los miembros.");
    }
  };

  const userId = localStorage.getItem("userId");

  const createdGroups = groups.filter(
    (group) => group.creator._id.toString() === userId
  );
  const memberGroups = groups.filter(
    (group) => group.creator._id.toString() !== userId
  );

  return (
    <div className="groups-page">
      <Title level={2}>Mis Grupos</Title>

      <Title level={3}>Grupos que he creado</Title>
      <List
        loading={loading}
        dataSource={createdGroups}
        renderItem={(group) => (
          <Card
            title={group.name}
            extra={
              <Button type="primary" onClick={() => handleOpenModal(group._id)}>
                Agregar nuevo integrante
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            <Text strong>Descripción:</Text> {group.description}
            <br />
            <Text strong>Miembros:</Text>{" "}
            {group.members.map((member) => member.username).join(", ")}
          </Card>
        )}
      />

      <Title level={3}>Grupos a los que pertenezco</Title>
      <List
        loading={loading}
        dataSource={memberGroups}
        renderItem={(group) => (
          <Card
            title={group.name}
            extra={<Button type="primary">Ver detalles</Button>}
            style={{ marginBottom: 16 }}
          >
            <Text strong>Descripción:</Text> {group.description}
            <br />
            <Text strong>Creador:</Text> {group.creator.username}
            <br />
            <Text strong>Miembros:</Text>{" "}
            {group.members.map((member) => member.username).join(", ")}
          </Card>
        )}
      />

      {/* Modal para agregar miembros */}
      <Modal
        title="Agregar miembros al grupo"
        visible={isModalVisible}
        onOk={handleAddMembers}
        onCancel={handleCloseModal}
        okText="Agregar"
        cancelText="Cancelar"
      >
        <p>Ingresa los correos electrónicos de los usuarios a agregar (separados por comas):</p>
        <Input.TextArea
          value={newMembers}
          onChange={(e) => setNewMembers(e.target.value)}
          placeholder="ejemplo1@gmail.com, ejemplo2@hotmail.com"
          rows={3}
        />
      </Modal>
    </div>
  );
};

export default GroupsPage;
