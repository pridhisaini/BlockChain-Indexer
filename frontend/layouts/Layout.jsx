/**
 * LAYOUT - MAIN LAYOUT
 * =====================
 * WHY: Separates layout structure from routing.
 * Provides consistent page wrapper.
 */

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import VideoBackground from '../components/VideoBackground';
import './Layout.css';

function Layout({ children }) {
    return (
        <div className="layout">
            <VideoBackground />
            <Header />
            <div className="layout-container">
                <Sidebar />
                <main className="layout-main">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default Layout;
