import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./Pages/LoginPage";
import HomePage from "./Pages/HomePage";
import Dashboard from "./Pages/DashBoard";
import Layout from "./components/Layout";
import Statistics from "./Pages/Statistics";
import Archive from "./Pages/ArchivePage";
import AddTask from "./Pages/AddTask";
import Profile from "./Pages/Profile";
import './styles/theme-variables.css';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/dark-theme.css';
import './styles/ThemeToggle.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Login sayfası - Sidebar YOK */}
          <Route path="/" element={<LoginPage />} />
          
          {/* Diğer sayfalar - Sidebar VAR */}
          <Route path="/arsiv" element={<Layout><Archive /></Layout>} />
          <Route path="/add-task" element={<Layout><AddTask /></Layout>} />
          <Route path="/home" element={<Layout><HomePage /></Layout>} />
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/statistics" element={<Layout><Statistics /></Layout>} />
          <Route path="/settings" element={<Layout><div style={{padding: '2rem'}}>⚙️ Ayarlar sayfası yakında...</div></Layout>} />
        
        {/* Diğer sayfalar - Sidebar VAR */}
        <Route path="/arsiv" element={<Layout><Archive /></Layout>} />
        <Route path="/profil" element={<Layout><Profile /></Layout>} />
        <Route path="/add-task" element={<Layout><AddTask /></Layout>} />
        <Route path="/home" element={<Layout><HomePage /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/statistics" element={<Layout><Statistics /></Layout>} />
        <Route path="/settings" element={<Layout><div style={{padding: '2rem'}}>⚙️ Ayarlar sayfası yakında...</div></Layout>} />
       
      </Routes>
    </Router>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;