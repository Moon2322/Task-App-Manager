import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Registerpage from "./pages/Registerpage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./layouts/MainLayouts"; 
import Groupspage from "./pages/Groupspage";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/LandingPage" />} />
        <Route path="/LandingPage" element={<LandingPage />} />
        <Route path="/LoginPage" element={<LoginPage />} />
        <Route path="/Registerpage" element={<Registerpage />} />
        <Route path="/dashboard" element={<MainLayout />}>
        <Route index element={<Dashboard />} /> </Route>
        <Route path="/Groupspage" element={<MainLayout />}>
        <Route index element={<Groupspage />} /> </Route>

      </Routes>
    </Router>
  </React.StrictMode>
);
