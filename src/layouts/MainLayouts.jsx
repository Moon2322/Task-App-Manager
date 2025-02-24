import { Layout, Menu } from "antd";
import { Outlet, useNavigate } from "react-router-dom";
import { UserOutlined, HomeOutlined, SettingOutlined, LogoutOutlined } from "@ant-design/icons";
import "./../Css/MainLayout.css";

const { Header, Content, Sider } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/LoginPage");
  };

  return (
    <Layout className="main-layout" style={{ minHeight: "100vh" }}>
      <Sider className="sidebar" breakpoint="lg" collapsedWidth="0">
        <div className="logo">Mi App</div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={["1"]}
          onClick={({ key }) => {
            if (key === "logout") {
              handleLogout();
            } else {
              navigate(key);
            }
          }}
          items={[
            { key: "/dashboard", icon: <HomeOutlined />, label: "Dashboard" },
            { key: "/perfil", icon: <UserOutlined />, label: "Perfil" },
            { key: "/Groupspage", icon: <UserOutlined />, label: "Grupos" },
            { key: "/configuracion", icon: <SettingOutlined />, label: "Configuración" },
            { key: "logout", icon: <LogoutOutlined />, label: "Cerrar sesión", danger: true },
          ]}
        />
      </Sider>
      <Layout>
        <Header className="header">Dashboard</Header>
        <Content
          className="content"
          style={{
            margin: "24px 16px",
            padding: 24,
            minHeight: 280,
            overflowY: "auto", 
          }}
        >
          <Outlet /> 
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;