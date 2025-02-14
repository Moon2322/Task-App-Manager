import { Layout, Menu } from "antd";
import { Outlet, useNavigate } from "react-router-dom";
import { UserOutlined, HomeOutlined, SettingOutlined } from "@ant-design/icons";
import "./../Css/MainLayout.css";

const { Header, Content, Sider } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();

  return (
    <Layout className="main-layout">
      <Sider className="sidebar">
        <div className="logo">Mi App</div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={["1"]}
          onClick={({ key }) => navigate(key)}
          items={[
            { key: "/dashboard", icon: <HomeOutlined />, label: "Dashboard" },
            { key: "/perfil", icon: <UserOutlined />, label: "Perfil" },
            { key: "/configuracion", icon: <SettingOutlined />, label: "Configuración" },
          ]}
        />
      </Sider>
      <Layout>
        <Header className="header">Dashboard</Header>
        <Content className="content">
          <Outlet /> 
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
