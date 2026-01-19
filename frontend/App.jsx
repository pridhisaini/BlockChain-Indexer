/**
 * MAIN APP COMPONENT
 * ===================
 * WHY: Entry point for React application.
 * Sets up routing using Layout component.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import NetworkOverview from './pages/NetworkOverview';
import Blocks from './pages/Blocks';
import Transactions from './pages/Transactions';
import AddressDetails from './pages/AddressDetails';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ethereum" element={<NetworkOverview />} />
            <Route path="/bitcoin" element={<NetworkOverview />} />
            <Route path="/blocks" element={<Blocks />} />
            <Route path="/blocks/:identifier" element={<Blocks />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:hash" element={<Transactions />} />
            <Route path="/address/:address" element={<AddressDetails />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

