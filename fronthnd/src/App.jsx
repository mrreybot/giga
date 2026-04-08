<<<<<<< HEAD
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/DashBoard";
=======
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./Pages/LoginPage";
import HomePage from "./Pages/HomePage";
import Dashboard from "./Pages/Dashboard";
import Layout from "./components/Layout";
import Statistics from "./Pages/Statistics";
import Archive from "./Pages/ArchivePage";
import AddTask from "./Pages/AddTask";
import Profile from "./Pages/Profile";
import Organ from "./Pages/Organ";
import People from "./Pages/AddPeople";
import Admin from "./Pages/Admin";
import ProjectList from "./Pages/Projects/ProjectList";
import ProjectDetail from "./Pages/Projects/ProjectDetail";
>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced

function App() {
  return (
    <Router>
      <Routes>
<<<<<<< HEAD
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
=======

        {/* Login sayfası - Sidebar yok */}
        <Route path="/" element={<LoginPage />} />

        {/* Sidebar'lı sayfalar */}
        <Route path="/home" element={<Layout><HomePage /></Layout>} />
        <Route path="/org" element={<Layout><Organ /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/statistics" element={<Layout><Statistics /></Layout>} />
        <Route path="/admin" element={<Layout><Admin /></Layout>} />
        <Route path="/arsiv" element={<Layout><Archive /></Layout>} />
        <Route path="/add-task" element={<Layout><AddTask /></Layout>} />
        <Route path="/profil" element={<Layout><Profile /></Layout>} />
        <Route path="/settings" element={<Layout><div style={{ padding: '2rem' }}>⚙️ Ayarlar yakında...</div></Layout>} />
        <Route path="/addpeople" element={<Layout><People /></Layout>} />
        <Route path="/projects" element={<Layout><ProjectList /></Layout>} />
        <Route path="/projects/:id" element={<Layout><ProjectDetail /></Layout>} />

>>>>>>> 9d4a0584d37ebbb0bf0e81a90981124d08d63ced
      </Routes>
    </Router>
  );
}

export default App;
