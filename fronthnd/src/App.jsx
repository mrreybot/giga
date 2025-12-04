import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./Pages/LoginPage";
import HomePage from "./Pages/HomePage";
import Dashboard from "./Pages/DashBoard";
import Layout from "./components/Layout";

function App() {
  return (
    <Router>
      <Routes>
        {/* Login sayfası - Sidebar YOK */}
        <Route path="/" element={<LoginPage />} />
        
        {/* Diğer sayfalar - Sidebar VAR */}
        <Route path="/home" element={<Layout><HomePage /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/settings" element={<Layout><div style={{padding: '2rem'}}>⚙️ Ayarlar sayfası yakında...</div></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;