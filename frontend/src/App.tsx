import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Locations } from './pages/Locations';
import { WineDetail } from './pages/WineDetail';
import { WineForm } from './pages/WineForm';
import { Settings } from './pages/Settings';
import { WineList } from './pages/WineList';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vins" element={<WineList />} />
        <Route path="/vins/nouveau" element={<WineForm />} />
        <Route path="/vins/:id" element={<WineDetail />} />
        <Route path="/vins/:id/modifier" element={<WineForm />} />
        <Route path="/lieux" element={<Locations />} />
        <Route path="/reglages" element={<Settings />} />
      </Routes>
    </Layout>
  );
}
